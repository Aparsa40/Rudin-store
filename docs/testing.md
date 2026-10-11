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

The MongoDB-backed integration test is skipped by default. CI runs it against an ephemeral MongoDB replica set and a database named `rudin_store_integration_test`.

## MongoDB integration-test safety

The integration test clears documents from the `users`, `products`, and `adminstates` collections at setup and teardown. It must only ever target the isolated `rudin_store_integration_test` database. The test and backend connection guard reject other database names when `RUN_MONGODB_INTEGRATION=true`.

Never set `RUN_MONGODB_INTEGRATION=true` while using the manual test database (`rudin_store_test`), development database, or any production database. Do not remove the isolation guard to make tests pass.

For manual storefront testing, set the local `.env` `MONGODB_URI` to the Atlas connection URI with `/rudin_store_test` as the database path, then run the backend and Vite frontend separately. Keep real credentials only in the ignored local `.env`.

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

### Not yet fully backend-connected
Cart persistence, server-side inventory reservation, checkout/orders, payment provider/webhooks, account addresses, coupons, reviews, email verification, refresh-token rotation, and remaining seller/admin order/payout/settings screens require their own backend contracts and end-to-end tests. Do not treat mock-backed UI in those domains as production-connected.
