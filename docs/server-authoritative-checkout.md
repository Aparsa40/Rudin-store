# Server-Authoritative Checkout — Design and Status

## Status

Implemented in this phase (provider-independent):

- Backend order model (`OrderModel`) with honest state enums.
- `POST /api/orders` — authenticated order creation where the server:
  - resolves every item against **published** products in the database;
  - computes unit prices, subtotals, and the order total **exclusively from database prices**;
  - ignores all client-supplied monetary fields;
  - runs stock decrements and order persistence inside **one MongoDB transaction** (the integration database is a replica set, so transactions are available): any failure — insufficient stock, a duplicate idempotency key, or a persistence error — rolls back every decrement, so failed orders never consume inventory;
  - matches variant stock with `$elemMatch`, so the variant identity and the sufficient-stock condition must hold on the **same array element** — one variant's stock can never satisfy another variant's order;
  - supports an optional `Idempotency-Key` header (8–128 chars) guarded by a **unique partial index on `(userId, idempotencyKey)`**: replays return the original order without re-decrementing stock, and concurrent same-key requests resolve to exactly one order — the loser's transaction is rolled back and the committed order is replayed;
  - creates every order as `status: PENDING` and `paymentStatus: PENDING` — no payment gateway exists, so no order can be born `PAID`.
- `GET /api/orders` — the authenticated user's own orders only.
- `GET /api/orders/:id` — owner-scoped lookup; other users' orders return 404.
- Rate limiting: 30 requests per 15 minutes per IP on `/api/orders`.

## Deliberately not implemented (requires product decisions)

The roadmap forbids introducing a payment provider or redesigning checkout before the required decisions are documented. The following are open product decisions; none may be implemented by inferring a default:

1. **Payment provider** — no gateway is integrated. Online payment methods are accepted as a _method label_ only; payment stays `PENDING` until verified provider callbacks exist. Cash on delivery stays unpaid until settlement on delivery.
2. **Currency** — prices are stored as plain numbers; no currency code is defined anywhere in the stack.
3. **Tax rules** — the server currently computes `tax = 0`. Real tax rules (jurisdiction, rates, inclusive vs. exclusive) require a product decision.
4. **Shipping methods and costs** — the server currently computes `shippingCost = 0`. No shipping-method configuration exists; client-supplied shipping costs are ignored.
5. **Coupon/discount engine** — no server-side coupon model exists; discounts are not applied server-side yet.
6. **Multi-vendor order splitting** — one order currently contains items from multiple vendors; splitting into per-vendor suborders (and per-vendor fulfillment workflows) is a product decision.
7. **Order lifecycle management** — cancellation, refunds, and vendor fulfillment endpoints are not implemented.

## Frontend

The frontend `ordersService` remains browser-local in this phase. Connecting the UI to `/api/orders` is a separate, UI-facing change; until then the frontend must not claim server-side order persistence. The backend API above is the authoritative order record once adopted.

## Payment integration prerequisites (future)

When a payment provider is chosen:

1. Add a `PaymentAttempt` model storing provider, attempt id, and status — never raw card data.
2. Create orders as `PENDING` and transition `paymentStatus` only from a **verified provider callback** (signature-validated webhook), never from client responses.
3. Make order creation idempotent (already supported via `Idempotency-Key`).
4. Order creation already uses a multi-document transaction (stock + order insert, on the replica-set integration database and transaction-capable production clusters such as MongoDB Atlas). Extend that same transaction to the payment attempt when a provider is chosen. Note: a standalone `mongod` (no replica set) cannot run transactions, so local development must use a replica set.
