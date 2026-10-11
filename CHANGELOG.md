# Changelog

All notable changes to Rudin Store are documented here.

The project follows Semantic Versioning as described in VERSIONING.md.

---

## Unreleased

Backend, test, and documentation work merged to the default branch after the v2.1.0 frontend candidate. Not yet assigned to a release version.

### Added — Backend (Node.js/Express/MongoDB)

- Authentication API: registration (always CUSTOMER), login, `GET /api/auth/me`, scrypt password hashing, one-hour bearer tokens, token invalidation on password change and account status/authVersion changes.
- First-admin bootstrap (`POST /api/auth/bootstrap-admin`, secret-header, one-time) and admin management endpoints with a transactional singleton guard against concurrent bootstrap/disable bypasses.
- Password reset request/confirm with single-use hashed expiring tokens (delivery via Resend).
- Vendor applications and administrator approval with role escalation to VENDOR.
- Product catalog with pagination, search, price/rating/stock/sale, category/vendor/brand, featured/bestseller/new-arrival/flash-deal filters; product authoring with ownership and role enforcement; vendor-created products forced to DRAFT; publish/archive restricted to administrators; public catalog restricted to PUBLISHED products.
- Cloudinary image uploads with server-side format/signature validation.
- Server-authoritative order API (provider-independent):
  - `POST /api/orders` — authenticated order creation; prices, subtotals, and total computed exclusively from database product prices; client-supplied monetary fields ignored; only PUBLISHED products are orderable; stock decrements and order persistence run in one MongoDB transaction (any failure rolls back every decrement); variant stock matched with `$elemMatch`; optional `Idempotency-Key` header protected by a unique partial index on `(userId, idempotencyKey)` with duplicate-key races replaying the committed order; every order is created `status: PENDING` and `paymentStatus: PENDING`.
  - `GET /api/orders` and `GET /api/orders/:id` — owner-scoped order history; other users' orders return 404.
  - Rate limiting: 30 requests per 15 minutes per IP on `/api/orders`.
- Health endpoint and per-endpoint rate limiting on sensitive auth/bootstrap/upload routes.

### Added — Tests and CI

- `npm test` (`scripts/run-tests.mjs`) discovering every `*.test.ts` under `backend/` and `src/`.
- Backend unit tests: product validation, rate limiter behavior, image upload decoding.
- Frontend unit test for the browser-local `ordersService` (honest PENDING/payment states, no fabricated tracking, empty history by default).
- MongoDB integration suites, skipped unless `RUN_MONGODB_INTEGRATION=true`:
  - security suite (`rudin_store_integration_test`): authentication, disabled/revoked token rejection, role boundaries, concurrent first-admin bootstrap, vendor approval, product lifecycle and cross-vendor ownership, public catalog PUBLISHED-only.
  - orders suite (dedicated `rudin_store_integration_test_orders` database, port 4318): unauthenticated/invalid payload rejection, server-computed totals with client totals ignored, DRAFT rejection, out-of-stock rollback, variant mismatch (`$elemMatch`), sequential and concurrent idempotent replay, persistence-failure rollback, cross-user isolation.
- Runtime database guard: integration mode refuses any database other than `rudin_store_integration_test` (or a dedicated `rudin_store_integration_test_*` derivation used by a parallel suite).
- GitHub Actions CI: TypeScript check (tsc + full test suite against an ephemeral MongoDB replica set) and production build on pull requests and pushes to the main branch.

### Documentation

- `backend/README.md`: API reference including the server-authoritative orders section and test guidance.
- `docs/server-authoritative-checkout.md`: order API design, deliberate non-goals, and the open product decisions (payment provider, currency, tax, shipping, coupons, multi-vendor splitting, order lifecycle).
- Root README, docs index, backend-integration contract, and testing guide updated to match the implemented system (Phase D documentation accuracy pass): the frontend `ordersService` is documented as browser-local and not connected to the order API, and unimplemented domains are explicitly listed.
- Frontend integration status correction pass: only the login and registration forms call the auth API (session restore reads local state and never calls `GET /api/auth/me`; logout, profile updates, and the address book are browser-local); admin orders/coupons and seller order-fulfillment/payout/settings screens are documented as mock or presentation-only; the shared role-redirecting `/login` page and the `CUSTOMER`/`VENDOR`/`ADMIN` role set are documented as the current authentication UI (no separate role portals, no `MANAGER` role).

### Validation

Verified through GitHub Actions CI on pull requests to the main branch (TypeScript Check: `tsc --noEmit` plus the complete unit and integration test suite against an ephemeral MongoDB replica set; Production Build: `vite build`). Local runs were not performed by the automation; CI artifacts are the authoritative record.

### Known limitations

- No payment provider, verified payment callbacks, currency/tax/shipping/coupon rules, order lifecycle workflows, or seller payouts; orders can only be created PENDING and never become PAID.
- The frontend checkout/order flow still uses browser-local storage and does not call the order API.
- Frontend session restore, logout, profile updates, and the address book are browser-local; the frontend never calls `GET /api/auth/me`, and the admin/seller dashboard order, coupon, payout, and settings tabs are mock or presentation-only.
- MongoDB transactions require a replica-set or sharded deployment; a standalone `mongod` cannot serve order or admin-critical operations.

---

## [2.1.0] — Release Candidate

Version 2.1.0 is the hardening upgrade currently under review in release/v2.1.0.

### Added

- ProtectedRoute for account, seller, and admin route UX protection.
- Explicit demo-role support for CUSTOMER, VENDOR, and ADMIN.
- products.service.ts service barrel.
- Coupon validity-window support through validFrom and validUntil.

### Improved

- Authentication starts unauthenticated instead of with a fake pre-authenticated customer.
- Auth store, login flow, and header use the same v2.1 API.
- Cart operations validate available stock before increasing quantities.
- Save-for-later restoration respects stock.
- Coupon validation checks active state, validity dates, minimum purchase, percentage limits, and maximum discount.
- Vendor, coupon, and product demo persistence is more consistent.
- TypeScript strict and filename-casing checks are enabled.
- The conflicting Tailwind flex + block utility combination in Header was removed.

### Documentation

- Updated all repository documentation from the v2.0.0 baseline to the v2.1.0 candidate.
- Documented the boundary between demo/local behavior and trusted backend behavior.
- Documented planned authentication, cart/checkout, Contact Us, and PostgreSQL integration.
- Documented favicon/logo integration as a pending branding step.

### Validation

    npm ci       PASS — 0 vulnerabilities reported
    npm run lint PASS
    npm run build PASS

The production build has a non-blocking JavaScript chunk-size warning above Vite's default 500 kB threshold.

### Security / Architecture Notes

v2.1.0 still uses mock/demo authentication, browser persistence, and frontend route guards. Production work remains required for server authentication/authorization, secure sessions, transactional inventory, real payments, shipping, payouts, and contact/email backend services. (The unreleased backend in this changelog's Unreleased section addresses authentication, authorization, and transactional inventory; payments and the remaining domains are still open.)

---

## [2.0.0] — 2026-10-06

### Added

- Multi-vendor marketplace frontend architecture.
- Domain-oriented service layer.
- Authentication, cart, wishlist, coupon, order, review, vendor, and category services.
- Global UI state management.
- Reusable UI primitives and technical documentation.

### Improved

- Product browsing and filtering.
- Product detail experience.
- Multi-vendor cart and checkout workflows.
- Customer, seller, and admin workflows.
- Authentication state handling.
- Service-layer separation and TypeScript contracts.

---

## [1.0.0]

Initial documented frontend baseline.
