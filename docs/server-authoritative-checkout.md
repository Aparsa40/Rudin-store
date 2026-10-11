# Server-Authoritative Checkout — Design and Status

## Status

Implemented in this phase (provider-independent):

- Backend order model (`OrderModel`) with honest state enums.
- `POST /api/orders` — authenticated order creation where the server:
  - resolves every item against **published** products in the database;
  - computes unit prices, subtotals, and the order total **exclusively from database prices**;
  - ignores all client-supplied monetary fields;
  - decrements product/variant stock **atomically** (`stock: { $gte: quantity }` filter) and compensates already-applied decrements when a later line fails;
  - supports an optional `Idempotency-Key` header (8–128 chars): replays return the original order without re-decrementing stock;
  - creates every order as `status: PENDING` and `paymentStatus: PENDING` — no payment gateway exists, so no order can be born `PAID`.
- `GET /api/orders` — the authenticated user's own orders only.
- `GET /api/orders/:id` — owner-scoped lookup; other users' orders return 404.
- Rate limiting: 30 requests per 15 minutes per IP on `/api/orders`.

## Deliberately not implemented (requires product decisions)

The roadmap forbids introducing a payment provider or redesigning checkout before the required decisions are documented. The following are open product decisions; none may be implemented by inferring a default:

1. **Payment provider** — no gateway is integrated. Online payment methods are accepted as a *method label* only; payment stays `PENDING` until verified provider callbacks exist. Cash on delivery stays unpaid until settlement on delivery.
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
4. Consider multi-document transactions (the CI database is a replica set, so transactions are available) to replace compensation-based stock rollback.
