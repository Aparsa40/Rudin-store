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

- Backend unit tests covering product validation, rate limiting, and the uploads routes.
- A frontend unit test for the browser-local `ordersService`.
- Two MongoDB-backed integration suites: `backend/integration/security.integration.test.ts` and `backend/integration/orders.integration.test.ts`.

The integration suites are skipped unless `RUN_MONGODB_INTEGRATION=true` is set. CI runs `npm test` with that flag against an ephemeral MongoDB replica set, then runs the production build.

## Integration suite scope

The security suite covers authentication, role enforcement, administrator bootstrap (including concurrent bootstrap attempts), vendor application approval, product ownership, and published-only catalog visibility.

The orders suite covers server-authoritative pricing (client-supplied totals ignored), stock decrement, transaction rollback on order-persistence failure, concurrent requests with the same idempotency key, variant-specific inventory matching (insufficient requested variant, sufficient other variant), cross-user order isolation, and draft-product rejection.

All test files were audited for assertion quality: no tautological or unconditional-pass assertions (`|| true` patterns) exist in any test file.

## MongoDB integration-test safety

The two integration suites run in parallel and use separate, derived databases:
- `rudin_store_integration_test` for the security suite.
- `rudin_store_integration_test_orders` for the orders suite, derived automatically from the configured test URI so the parallel suites cannot wipe each other's data.

Each suite clears only its own database collections (`users`, `products`, `adminstates`, and for the orders suite also `orders`) at setup and teardown, kills its child server process, and closes the mongoose connection in a `finally` block. The backend connection guard and the test assertions reject database names outside the `rudin_store_integration_test*` family when `RUN_MONGODB_INTEGRATION=true`.

Never set `RUN_MONGODB_INTEGRATION=true` while using the manual test database (`rudin_store_test`), development database, or any production database. Do not remove the isolation guard to make tests pass.

For manual storefront testing, set the local `.env` `MONGODB_URI` to the Atlas connection URI with `/rudin_store_test` as the database path, then run the backend and Vite frontend separately. Keep real credentials only in the ignored local `.env`.

## Known coverage gaps

These areas currently have no automated tests and are documented rather than invented: cart stock validation, coupon validation, `ProtectedRoute`, frontend services other than `ordersService` (including the API-backed login/register wiring and the browser-local session-restore/logout/profile/address operations), admin/seller dashboard components, and end-to-end flows. The `ordersService` unit test intentionally validates the current browser-local (localStorage) behavior; it does not verify server integration because the frontend is not yet connected to `/api/orders`.

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
- Verify seller product creation, editing, unpublishing, archiving, and image upload after Cloudinary credentials are configured.
- Admin product management and vendor-application review use backend endpoints.
- The admin orders and coupons tabs and the seller order-fulfillment, payouts, and settings tabs are mock or presentation-only; do not use them to validate backend behavior.

### Not yet fully backend-connected
The frontend checkout and orders UI still runs on the browser-local `ordersService` (localStorage) and is not yet connected to the server-authoritative order API. Session restore, logout, profile updates, and the address book are browser-local (`GET /api/auth/me` is never called). Cart persistence, payment provider/webhooks, account addresses, coupons, reviews, email verification, refresh-token rotation, and remaining seller/admin order/payout/settings screens require their own backend contracts and end-to-end tests. Do not treat mock-backed UI in those domains as production-connected.
