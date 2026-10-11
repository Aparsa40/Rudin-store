# Backend API: Authentication, administrators, products, and orders

## Authentication

- `POST /api/auth/register`: creates a customer account. Public registration cannot choose an elevated role.
- `POST /api/auth/login`: validates credentials against MongoDB and returns a one-hour bearer access token.
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

## First administrator bootstrap

The first admin must be created once using `POST /api/auth/bootstrap-admin`. Before starting the API, put a separate random value of at least 32 characters in local `.env` as `ADMIN_BOOTSTRAP_SECRET`. Send it in the `X-Admin-Bootstrap-Secret` header with a JSON body containing `email`, `password` (12–128 characters), and `firstName` (optional `lastName`). The route only works while no admin account exists. After success, remove `ADMIN_BOOTSTRAP_SECRET` from `.env` and restart the API. Never expose the bootstrap secret in a browser app or commit it.

## Administrator management

All routes under `/api/admin` require an active administrator bearer token.

- `GET /api/admin/admins`: list administrator accounts (never returns password hashes).
- `POST /api/admin/admins`: create another admin account.
- `PATCH /api/admin/admins/:id/status`: activate or disable an admin. The current admin cannot disable itself, and the last active admin cannot be disabled.

## Product catalog and authoring

- `GET /api/products`: published catalog with filters, sorting, and pagination.
- `GET /api/products/:identifier`: published product by ID or slug.
- `GET /api/products/mine`: returns all products for the current vendor, or all products for an administrator.
- `POST /api/products`: requires an active ADMIN or VENDOR bearer token. Admins can publish a product; vendor-created products are forced to DRAFT. Public requests cannot create or publish products.
- `PATCH /api/products/:id`: updates a product with validation and owner checks. Only administrators can publish/archive products or change featured status.
- `DELETE /api/products/:id`: archives a product after an owner/admin authorization check.

Product CRUD/archive, vendor onboarding/ownership checks, Cloudinary image upload, rate limiting, and password-reset API are implemented. Login/Register and the seller/admin product-management flows use the API. The public storefront catalog service reads published products from the API, including search, price/rating/stock/sale filters, vendor/category filters, featured/bestseller/new-arrival/flash-deal lists, and product details.

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

The Vite client uses `VITE_API_URL` (default `http://localhost:4000`) for login and customer registration. The access token is held in memory and is not written to localStorage. A page refresh therefore requires signing in again until a refresh-token/session endpoint is implemented. Set `VITE_ENABLE_DEMO_AUTH=true` only for local development to reveal demo-role buttons; these sessions do not carry API credentials and must never be treated as real authentication.

Public registration always creates a `CUSTOMER`. Seller registration submits a vendor application; an administrator must approve it before the account receives the `VENDOR` role. Applications are available under `/api/admin/vendors/applications`.

## Validation and tests

Run the automated tests with:

```powershell
npm test
```

`npm test` discovers every `*.test.ts` under `backend/` and `src/`:

- Backend unit tests: product-input validation, rate-limiter behavior, upload image decoding.
- Frontend unit test: the browser-local `ordersService` (orders start PENDING/unpaid, no fabricated tracking data).
- MongoDB integration suites (skipped unless `RUN_MONGODB_INTEGRATION=true`):
  - the security suite on `rudin_store_integration_test` covers authentication, disabled/revoked tokens, role boundaries, concurrent first-admin bootstrap, vendor approval, product lifecycle, cross-vendor ownership, and PUBLISHED-only public catalog;
  - the orders suite runs on a dedicated derived database (`rudin_store_integration_test_orders`) on its own port, because the Node test runner executes test files in parallel; it covers server-computed pricing, out-of-stock and persistence-failure transaction rollback, variant mismatch, sequential and concurrent idempotent replays, and cross-user order isolation.

Both integration suites assert that their URI targets only the isolated integration database(s), delete their collections' documents at setup and teardown, terminate their spawned API child processes, and close their Mongoose connections in a `finally` block. The backend connection guard refuses any other database when `RUN_MONGODB_INTEGRATION=true`. CI uses an ephemeral MongoDB replica set. Never point `RUN_MONGODB_INTEGRATION=true` at a development, manual-test, or production database. Run `npm run lint`, `npm test`, and `npm run build` before merging.

## Administrator concurrency safety

The first-admin bootstrap and admin status-change operations share a transactional singleton guard. This serializes competing admin-critical transactions and prevents concurrent requests from bypassing the first-admin or final-active-admin checks. This mechanism requires MongoDB transactions, so use MongoDB Atlas or another replica-set/sharded deployment; a standalone MongoDB server does not support these transactions. Integration tests against the configured MongoDB deployment are still required before production use.
