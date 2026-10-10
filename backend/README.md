# Backend API: Authentication, administrators, and products

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

Product CRUD/archive, vendor onboarding/ownership checks, Cloudinary image upload, rate limiting, and password-reset API are implemented on this branch. Login/Register and the seller/admin product-management flows use the API. The public storefront catalog is being migrated to the API as well. Email verification, refresh-token rotation, orders, checkout, payments, addresses, coupons, reviews, and several seller/admin dashboard sections do not yet have complete production backend endpoints. Do not treat those domains as backend-connected or production-ready until their API contracts and end-to-end tests are implemented.

## Frontend authentication

The Vite client uses `VITE_API_URL` (default `http://localhost:4000`) for login and customer registration. The access token is held in memory and is not written to localStorage. A page refresh therefore requires signing in again until a refresh-token/session endpoint is implemented. Set `VITE_ENABLE_DEMO_AUTH=true` only for local development to reveal demo-role buttons; these sessions do not carry API credentials and must never be treated as real authentication.

Public registration always creates a `CUSTOMER`. Seller registration submits a vendor application; an administrator must approve it before the account receives the `VENDOR` role. Applications are available under `/api/admin/vendors/applications`.

## Validation and tests

Run the backend validation tests with:

```powershell
npm test
```

Product creation validates required fields, numeric ranges, image object shape and HTTP(S) URLs, tags/features limits, and string-valued specifications. Duplicate-key errors return HTTP 409 and Mongoose validation/cast errors return HTTP 400 without exposing database details.

Automated unit and MongoDB-backed integration tests cover product validation, rate limiting, upload validation, authentication, role boundaries, bootstrap, vendor approval, and product lifecycle. The integration test deletes documents from `users`, `products`, and `adminstates`; it therefore asserts that its URI targets only `rudin_store_integration_test`. CI uses an ephemeral MongoDB replica set. Never point `RUN_MONGODB_INTEGRATION=true` at a development, manual-test, or production database. Run `npm run lint`, `npm test`, and `npm run build` before merging.

## Administrator concurrency safety

The first-admin bootstrap and admin status-change operations share a transactional singleton guard. This serializes competing admin-critical transactions and prevents concurrent requests from bypassing the first-admin or final-active-admin checks. This mechanism requires MongoDB transactions, so use MongoDB Atlas or another replica-set/sharded deployment; a standalone MongoDB server does not support these transactions. Integration tests against the configured MongoDB deployment are still required before production use.
