# Testing and Validation

**Version:** 2.1.0

## Automated validation

Install dependencies:

```powershell
npm ci
```

Run TypeScript validation, unit/integration tests, and production build:

```powershell
npm run lint
npm test
npm run build
```

`npm test` runs `scripts/run-tests.mjs`, which discovers and executes every `*.test.ts` file under `backend/` and `src/`. The current inventory:

- Backend unit tests covering product validation (including video metadata), rate limiting, and the uploads routes. The seller media uploader's direct Cloudinary flow should also be smoke-tested with a configured Cloudinary account.
- A frontend unit test for the browser-local `ordersService`.
- A frontend unit test for the role-specific portal configuration (`src/config/authPortals.test.ts`): each portal's endpoint, required role, login route, and home route, plus protected-area portal resolution.
- Three MongoDB-backed integration suites: `backend/integration/security.integration.test.ts`, `backend/integration/orders.integration.test.ts`, and `backend/integration/login-portals.integration.test.ts`.

The integration suites are skipped unless `RUN_MONGODB_INTEGRATION=true` is set. CI runs `npm test` with that flag against an ephemeral MongoDB replica set, then runs the production build.

## Integration suite scope

The security suite covers authentication, role enforcement, manager bootstrap (including concurrent bootstrap attempts, where exactly one manager is created), manager-appointed administrators with permission presets, vendor application approval, product ownership, and published-only catalog visibility.

The orders suite covers server-authoritative pricing (client-supplied totals ignored), stock decrement, transaction rollback on order-persistence failure, concurrent requests with the same idempotency key, variant-specific inventory matching (insufficient requested variant, sufficient other variant), cross-user order isolation, and draft-product rejection.

The login-portals suite covers per-portal role matching with generic non-enumerating errors, pending and rejected vendor applicants on the vendor portal, public-registration role-escalation prevention (no ADMIN or MANAGER), manager-owned governance (the manager manages the catalog while appointed admins stay inside their granted permissions and cannot self-escalate), disabled-admin and expired-token rejection, and password-reset credential rotation with session revocation.

All test files were audited for assertion quality: no tautological or unconditional-pass assertions (`|| true` patterns) exist in any test file.

## MongoDB integration-test safety

The three integration suites run in parallel and use separate, derived databases:

- `rudin_store_integration_test` for the security suite.
- `rudin_store_integration_test_orders` for the orders suite, and `rudin_store_integration_test_portals` for the login-portals suite, each derived automatically from the configured test URI so the parallel suites cannot wipe each other's data.

Each suite clears only its own database collections (`users`, `products`, `adminstates`, and for the orders suite also `orders`) at setup and teardown, kills its child server process, and closes the mongoose connection in a `finally` block. The backend connection guard and the test assertions reject database names outside the `rudin_store_integration_test*` family when `RUN_MONGODB_INTEGRATION=true`.

Never set `RUN_MONGODB_INTEGRATION=true` while using the manual test database (`rudin_store_test`), development database, or any production database. Do not remove the isolation guard to make tests pass.

For manual storefront testing, set the local `.env` `MONGODB_URI` to the Atlas connection URI with `/rudin_store_test` as the database path, then run the backend and Vite frontend separately. Keep real credentials only in the ignored local `.env`.

## Known coverage gaps

These areas currently have no automated tests and are documented rather than invented: cart stock validation, coupon validation, `ProtectedRoute` and the portal page components themselves (the portal routing configuration is unit-tested, but not the React components), frontend services other than `ordersService` and the portal configuration (including the browser-local session-restore/logout/profile/address operations), admin/seller/manager dashboard components, and end-to-end flows. The `ordersService` unit test intentionally validates the current browser-local (localStorage) behavior; it does not verify server integration because the frontend is not yet connected to `/api/orders`.

## Manual validation priorities

### Authentication

- Register a customer and log in.
- Verify logout and protected-route behavior.
- Verify a customer cannot use administrator or seller-only API operations.
- Verify password reset only after Resend credentials and a verified sender are configured.

### Catalog

- Confirm the product listing, search, category/vendor filters, detail page, featured products, sale filters, and pagination use the API.
- The test database contains seed products with `PUBLISHED` status. Use only this database for manual catalog testing.
- Confirm a product created as a vendor remains a draft until an administrator publishes it.

### Seller/Admin

- Verify vendor application submission and administrator approval.
- Verify seller product creation, editing, unpublishing, archiving, multi-image/GIF uploads, video uploads, and product gallery previews after Cloudinary credentials are configured. Check that the API secret is absent from browser requests and that media is saved with product metadata.
- Admin product management and vendor-application review use backend endpoints.
- Manager console: bootstrap the primary manager, appoint an administrator with a permission preset, verify the appointed admin can exercise only the granted capabilities, and verify permission revocation applies immediately.
- The admin orders and coupons tabs and the seller order-fulfillment, payouts, and settings tabs are mock or presentation-only; do not use them to validate backend behavior.

### Not yet fully backend-connected

The frontend checkout and orders UI still runs on the browser-local `ordersService` (localStorage) and is not yet connected to the server-authoritative order API. Session restore, logout, profile updates, and the address book are browser-local (`GET /api/auth/me` is never called). Cart persistence, payment provider/webhooks, account addresses, coupons, reviews, email verification, refresh-token rotation, and remaining seller/admin order/payout/settings screens require their own backend contracts and end-to-end tests. Do not treat mock-backed UI in those domains as production-connected.
