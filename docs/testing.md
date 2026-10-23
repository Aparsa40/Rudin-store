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

### Command for running MongoDB backend tests, as an alternative to the `npm test` command

```powershell
node --env-file=.env --import tsx --test backend/integration/coupon-redemption.integration.test.ts
```

- Backend unit tests covering product validation (including video metadata), rate limiting, and the uploads routes. The seller media uploader's direct Cloudinary flow should also be smoke-tested with a configured Cloudinary account.
- A frontend unit test for the browser-local `ordersService`.
- A frontend unit test for the role-specific portal configuration (`src/config/authPortals.test.ts`): each portal's endpoint, required role, login route, and home route, plus protected-area portal resolution.
- Frontend localization unit tests: `src/i18n/core.test.ts` (language validation with the documented English fallback, translation interpolation, en/fa key parity, and non-empty values) and `src/i18n/format.test.ts` (locale-aware `Intl` price, number, date, and countdown formatting; the fa-IR date assertions deliberately avoid pinning a calendar system because ICU renders `fa-IR` with the Persian calendar by default).
- Homepage unit tests: `src/config/homeContent.test.ts` (bilingual copy completeness, links restricted to known routes, in-repo assets only) and `src/components/home/heroCarouselLogic.test.ts` (slide wrap-around, autoplay/reduced-motion/pause rules, and index normalization).
- Admin-contract unit tests: `src/config/adminPermissions.test.ts` (dashboard section-to-permission mapping with fail-closed behavior) and `src/services/admin/adminApi.test.ts` (admin API request building and response parsing, including coupon and order operations).
- Six MongoDB-backed integration suites: `backend/integration/security.integration.test.ts`, `backend/integration/orders.integration.test.ts`, `backend/integration/login-portals.integration.test.ts`, `backend/integration/coupons-orders.integration.test.ts`, `backend/integration/coupon-redemption.integration.test.ts`, and `backend/integration/manager-console.integration.test.ts`.

The test runner loads a local `.env` automatically through `dotenv/config`; set `RUN_MONGODB_INTEGRATION=true` and point `MONGODB_URI` at the dedicated `rudin_store_integration_test` database to run integration suites locally. If the opt-in flag or URI is absent outside CI, Node's test runner marks those suites skipped. In GitHub Actions, the runner fails fast if either integration setting is missing, preventing a green CI result with silently skipped MongoDB tests. CI starts an ephemeral MongoDB replica set, supplies both variables explicitly, and runs `npm test` in the TypeScript Check job while the Production Build job builds in parallel.

## Integration suite scope

The security suite covers authentication, role enforcement, manager bootstrap (including concurrent bootstrap attempts, where exactly one manager is created), manager-appointed administrators with permission presets, vendor application approval, product ownership, and published-only catalog visibility.

The orders suite covers server-authoritative pricing (client-supplied totals ignored), stock decrement, transaction rollback on order-persistence failure, concurrent requests with the same idempotency key, variant-specific inventory matching (insufficient requested variant, sufficient other variant), cross-user order isolation, and draft-product rejection.

The login-portals suite covers per-portal role matching with generic non-enumerating errors, pending and rejected vendor applicants on the vendor portal, public-registration role-escalation prevention (no ADMIN or MANAGER), manager-owned governance (the manager manages the catalog while appointed admins stay inside their granted permissions and cannot self-escalate), disabled-admin and expired-token rejection, and password-reset credential rotation with session revocation.

The manager-console suite covers MANAGER-only access boundaries for platform metrics, the customer directory, and audit history; `products:manage` scoping for read-only catalog oversight; server-side role validation for customer status changes (ADMIN and VENDOR targets are rejected and never modified); session revocation through `authVersion`; transactional audit coupling for sensitive actions; the invitation-resend state machine including its email-configuration gate without token rotation; and non-regression of the existing Manager invitation, admin governance, and vendor-review flows.

All test files were audited for assertion quality: no tautological or unconditional-pass assertions (`|| true` patterns) exist in any test file.

## MongoDB integration-test safety

The six integration suites use separate, derived databases and run sequentially (`--test-concurrency=1`) to avoid concurrent writes and API startup contention:

- `rudin_store_integration_test` for the security suite.
- `rudin_store_integration_test_orders` for the orders suite.
- `rudin_store_integration_test_portals` for the login-portals suite.
- `rudin_store_integration_test_coupons` for the coupons/orders permission and API suite.
- `rudin_store_integration_test_redeem` for transactional coupon-redemption concurrency.
- `rudin_store_integration_test_manager_console` for the manager-console suite.

Each suite derives its database name from the configured test URI and runs serially, so suites cannot wipe each other's data.

Each suite clears only its own database collections at setup and teardown, kills its child server process, and closes the Mongoose connection in a `finally` block. The backend connection guard and the test assertions reject database names outside the `rudin_store_integration_test*` family when `RUN_MONGODB_INTEGRATION=true`.

Never set `RUN_MONGODB_INTEGRATION=true` while using the manual test database (`rudin_store_test`), development database, or any production database. Do not remove the isolation guard to make tests pass.

For manual storefront testing, set the local `.env` `MONGODB_URI` to the Atlas connection URI with `/rudin_store_test` as the database path, then run the backend and Vite frontend separately. Keep real credentials only in the ignored local `.env`.

## Known coverage gaps

These areas currently have no automated tests and are documented rather than invented: cart stock validation, coupon validation, `ProtectedRoute` and the portal page components themselves (the portal routing configuration is unit-tested, but not the React components), frontend services other than `ordersService`, the admin API client, and the portal configuration (including the browser-local session-restore/logout/profile/address operations), admin/seller/manager dashboard components, and end-to-end flows. The `ordersService` unit test intentionally validates the current browser-local (localStorage) behavior; it does not verify server integration because the frontend is not yet connected to `/api/orders`.

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
