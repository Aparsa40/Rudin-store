# Backend API: Authentication, administrators, products, and orders

## Authentication

- `POST /api/auth/register`: creates a customer account. Public registration cannot choose an elevated role.
- `POST /api/auth/login`: validates credentials against MongoDB and returns a one-hour bearer access token. Accepts every active role; kept for backward compatibility.
- `POST /api/auth/customer/login`, `POST /api/auth/vendor/login`, `POST /api/auth/admin/login`, `POST /api/auth/manager/login`: role-specific portal logins sharing one credential-verification path. Each portal rejects otherwise valid credentials when the account role does not match, and answers unknown accounts, wrong passwords, and wrong roles with the same generic error so portal visitors cannot enumerate privileged accounts. The vendor portal additionally requires an `APPROVED` vendor application, so pending or rejected applicants cannot sign in there.
- `GET /api/auth/me`: returns the currently authenticated account.
- `POST /api/auth/password-reset/request`: sends a single-use reset link through Resend. Configure server-side `RESEND_API_KEY` and `EMAIL_FROM`.
- `POST /api/auth/password-reset/confirm`: validates the reset token, changes the password, and invalidates existing access tokens.
- Passwords are hashed with Node.js scrypt and random per-password salts; plaintext passwords are never stored.
- Send protected API requests with `Authorization: Bearer <accessToken>`.
- The token secret must be at least 32 characters. Generate one in PowerShell:
  ```powershell
  [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
  ```
  Put it in the ignored local `.env` as `AUTH_TOKEN_SECRET`. Do not commit or share it.

## First manager bootstrap

The single primary `MANAGER` account must be created once using `POST /api/auth/bootstrap-manager`. Before starting the API, put a separate random value of at least 32 characters in local `.env` as `MANAGER_BOOTSTRAP_SECRET`. Send it in the `X-Manager-Bootstrap-Secret` header with a JSON body containing `email`, `password` (12–128 characters), and `firstName` (optional `lastName`). The route only works while no manager account exists: the existence and email checks plus the insert run inside the transactional singleton guard, concurrent attempts are serialized, and late arrivals receive `409 BOOTSTRAP_CLOSED`. A missing or incorrect secret receives an indistinguishable `404`. After success, remove `MANAGER_BOOTSTRAP_SECRET` from `.env` and restart the API. Never expose the bootstrap secret in a browser app or commit it.

## Administrator governance (manager-appointed)

All routes under `/api/admin` require the active primary `MANAGER` bearer token. Admin accounts can never reach this governance area, even when the manager granted them permissions.

- `GET /api/admin/admins`: list administrator accounts (never returns password hashes).
- `POST /api/admin/admins`: appoint an admin account. The optional `permission` object is resolved server-side from `presets`, `allow`, and `deny` arrays; client-supplied permission lists are never stored directly, and unknown presets or permissions are rejected with `400 INVALID_PERMISSIONS`.
- `PATCH /api/admin/admins/:id/permissions`: replace the admin's effective permissions wholesale from a server-side resolution. `deny` always wins over `presets` and `allow`, so revocation is explicit. Because the whole router is manager-only, admins cannot edit their own or anyone else's permissions.
- `PATCH /api/admin/admins/:id/status`: activate or disable an admin. Disabled admins lose access immediately because the middleware re-reads account status on every request.

## Manager ownership and admin permissions

The `MANAGER` role is the single primary platform owner and is not an alias for `ADMIN`. The manager appoints admin accounts, exclusively controls their permissions, and passes every permission check. Admin accounts hold only the granular permissions the manager explicitly granted; they cannot grant themselves permissions, cannot appoint other admins, and cannot touch the manager's authority. The permission set is currently `vendors:review` (list and decide vendor applications) and `products:manage` (whole-catalog product authoring, publishing/archiving, and image uploads). Permission matrix, enforced server-side on every request:

| Capability | MANAGER | ADMIN | VENDOR | CUSTOMER |
|---|---|---|---|---|
| Appoint/permit/disable admins (`/api/admin/admins`) | Yes | No (403) | No (403) | No (403) |
| Review vendor applications (`/api/admin/vendors/applications`) | Yes | Only with `vendors:review` | No (403) | No (403) |
| Create/publish/archive any product; upload images | Yes | Only with `products:manage` | Own products only (drafts) | No (403) |
| Create an ADMIN or MANAGER through public registration | Not possible | Not possible | Via approved application | Yes (always CUSTOMER) |

Server-defined presets give the manager a safe shorthand: `vendor-support` (`vendors:review`) and `catalog-curator` (`vendors:review` + `products:manage`). The resolved list is stored on the account, so future preset redefinitions never silently re-grant permissions to existing admins. Manager and admin accounts can never be created through public registration; the manager exists only via the controlled bootstrap.

## Product catalog and authoring

- `GET /api/products`: published catalog with filters, sorting, and pagination.
- `GET /api/products/:identifier`: published product by ID or slug.
- `GET /api/products/mine`: returns all products for the current vendor, or the whole catalog for the manager or an admin holding `products:manage`.
- `POST /api/products`: requires the manager, an admin holding `products:manage`, or an active vendor. Catalog managers can publish a product and attribute it to a vendor; vendor-created products are forced to DRAFT. Public requests cannot create or publish products.
- `PATCH /api/products/:id`: updates a product with validation and owner checks. Only the manager or an admin holding `products:manage` can publish/archive products or change featured status.
- `DELETE /api/products/:id`: archives a product after an ownership or catalog-management authorization check.

Product CRUD/archive, vendor onboarding/ownership checks, Cloudinary image upload, rate limiting, and password-reset API are implemented. The frontend login and registration forms and the seller/admin product-management flows call the API. The public storefront catalog service reads published products from the API, including search, price/rating/stock/sale filters, vendor/category filters, featured/bestseller/new-arrival/flash-deal lists, and product details. Within the dashboards, product management, vendor-application review, and the manager console's administrator governance are API-backed: the admin orders and coupons tabs render mock data (coupon creation/toggling is in-memory state only), and the seller order-fulfillment, payouts, and settings tabs are presentation-only.

## Orders (server-authoritative)

- `POST /api/orders` (authentication required): creates an order. The server:
  - resolves every item against **published** products only (DRAFT/ARCHIVED or unknown products return 400 `PRODUCT_NOT_FOUND`; variant products require a `variantId` via 400 `VARIANT_REQUIRED`/`VARIANT_NOT_FOUND`);
  - computes unit prices, subtotals, and the total **exclusively from database prices** — client-supplied monetary fields are ignored entirely;
  - decrements product and variant stock inside the **same MongoDB transaction** as the order insert, so insufficient stock (409 `OUT_OF_STOCK`), a duplicate idempotency key, or any persistence/validation failure rolls back every decrement and consumes no inventory;
  - matches variant stock with `$elemMatch`, so the variant identity and the sufficient-stock condition must hold on the same array element;
  - supports an optional `Idempotency-Key` header (8–128 characters). A unique partial index on `(userId, idempotencyKey)` makes idempotency race-safe: a replay or a concurrent duplicate returns 200 with `idempotentReplay: true` and the original order, never a second order or a second decrement;
  - creates every order as `status: PENDING` and `paymentStatus: PENDING`. No payment gateway exists, so no order can be born `PAID`; `paymentMethod` is a label only (CASH_ON_DELIVERY, CREDIT_CARD, PAYPAL, APPLE_PAY).
- `GET /api/orders` (authentication required): the authenticated user's own orders, newest first.
- `GET /api/orders/:id` (authentication required): owner-scoped lookup. Another user's order is indistinguishable from a missing one (404 `ORDER_NOT_FOUND`).
- Rate limiting: 30 requests per 15 minutes per IP on `/api/orders`.

Order creation uses MongoDB multi-document transactions, so the database must be a replica set (MongoDB Atlas or a local replica set); a standalone `mongod` cannot serve `POST /api/orders`. Tax and shipping are computed as zero until the corresponding product decisions are made (see `docs/server-authoritative-checkout.md`). The frontend checkout flow does **not** call these endpoints yet; the frontend `ordersService` remains browser-local.

## Not implemented

There is no payment-provider integration, no verified payment callbacks, no coupon engine, no cancellation/refund/fulfillment endpoints, no per-vendor order splitting, no server-side cart persistence, no customer address CRUD, and no reviews endpoint. Email verification and refresh-token rotation are also not implemented. Do not treat those domains as backend-connected or production-ready until their API contracts and tests exist.

## Frontend authentication

The Vite client uses `VITE_API_URL` (default `http://localhost:4000`) for the portal login pages and the registration form. The access token is held in memory and is not written to localStorage; only the user object is persisted locally, and a rehydrated user is not treated as authenticated. A page refresh therefore requires signing in again until a refresh-token/session endpoint is implemented.

Only the portal login pages and the registration form call the auth API. The frontend session restore (`authService.getCurrentUser`) reads the persisted local user object and never calls `GET /api/auth/me`; `logout` is a local-only operation that clears browser state without invalidating the token server-side (the one-hour token expires on its own); `updateProfile` updates only the local user object; and the address book is browser-local (`localStorage` with mock fallback) because no profile or address endpoints exist yet.

The login UI provides independent portals — `/login` (customer), `/vendor/login`, `/admin/login`, and `/manager/login` — each with its own branding, copy, and post-login destination (`/account`, `/seller/dashboard`, `/admin`, and `/manager`). Each page submits only to its own role-specific endpoint; unauthenticated visitors to a protected area are redirected to the portal for that area with their destination preserved, and authenticated users with the wrong role are routed to their own home area. The backend role set is `CUSTOMER`, `VENDOR`, `ADMIN`, and `MANAGER`: the manager is the single primary platform owner (bootstrap-only) and appoints admins with granular permission presets. The production header account menu links to the real portal sign-in pages instead of switching simulated roles. Set `VITE_ENABLE_DEMO_AUTH=true` only for local development to reveal demo-role buttons; these sessions do not carry API credentials and must never be treated as real authentication.

Public registration always creates a `CUSTOMER`. Seller registration submits a vendor application; the manager or an admin holding `vendors:review` must approve it before the account receives the `VENDOR` role. Applications are available under `/api/admin/vendors/applications`.

## Validation and tests

Run the automated tests with:

```powershell
npm test
```

`npm test` discovers every `*.test.ts` under `backend/` and `src/`:

- Backend unit tests: product-input validation, rate-limiter behavior, upload image decoding.
- Frontend unit test: the browser-local `ordersService` (orders start PENDING/unpaid, no fabricated tracking data).
- MongoDB integration suites (skipped unless `RUN_MONGODB_INTEGRATION=true`):
  - the security suite on `rudin_store_integration_test` covers authentication, disabled/revoked tokens, role boundaries, concurrent manager bootstrap (exactly one manager can be created), manager-appointed administrators with server-resolved permission presets, vendor approval, product lifecycle, cross-vendor ownership, and PUBLISHED-only public catalog;
  - the orders suite runs on a dedicated derived database (`rudin_store_integration_test_orders`) on its own port, because the Node test runner executes test files in parallel; it covers server-computed pricing, out-of-stock and persistence-failure transaction rollback, variant mismatch, sequential and concurrent idempotent replays, and cross-user order isolation.
  - the login-portals suite runs on a dedicated derived database (`rudin_store_integration_test_portals`) on port 4319; it covers per-portal role matching with generic errors, pending/rejected vendor applicants on the vendor portal, public-registration role-escalation prevention, manager-owned governance (the manager manages the catalog while appointed admins stay inside their granted permissions and cannot self-escalate), disabled-admin and expired-token rejection, and password-reset credential rotation.

Every integration suite asserts that its URI targets only the isolated integration database(s), deletes its collections' documents at setup and teardown, terminates its spawned API child process, and closes its Mongoose connection in a `finally` block. The backend connection guard refuses any other database when `RUN_MONGODB_INTEGRATION=true`. CI uses an ephemeral MongoDB replica set. Never point `RUN_MONGODB_INTEGRATION=true` at a development, manual-test, or production database. Run `npm run lint`, `npm test`, and `npm run build` before merging.

## Manager bootstrap concurrency safety

The manager bootstrap's existence checks ("a manager already exists" and "email already in use") and the account insert run inside a shared transactional singleton guard. This serializes competing bootstrap transactions and guarantees that exactly one manager account can ever be created, even under concurrent requests. This mechanism requires MongoDB transactions, so use MongoDB Atlas or another replica-set/sharded deployment; a standalone MongoDB server does not support these transactions. Integration tests against the configured MongoDB deployment are still required before production use.
