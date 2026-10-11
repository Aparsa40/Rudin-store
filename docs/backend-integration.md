# Backend Integration Contract

This document records the actual API boundary and the remaining integration work for Rudin Store v2.1.0.

## Architecture

The application uses MongoDB Atlas through the Node.js backend. The browser must never connect directly to MongoDB or receive database credentials.

```text
React UI → Zustand/domain service → HTTP API → Express backend → Mongoose → MongoDB Atlas
```

The browser-facing API base URL is `VITE_API_URL` (default `http://localhost:4000`). Server secrets belong only in the backend's ignored local `.env` or deployment secrets.

## Implemented backend endpoints

### Authentication and account security
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/bootstrap-admin` (one-time setup)
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`

Passwords are scrypt-hashed. Role checks are enforced by the backend, not by UI routing alone. Password-reset tokens are single-use, hashed, and expire. Email verification and refresh-token rotation are not implemented yet.

Frontend wiring status (authentication): only the login and registration forms call these endpoints. The frontend session restore (`getCurrentUser`) reads the persisted local user state and never calls `GET /api/auth/me`; logout is browser-local (no server-side token-invalidation endpoint is called); profile updates and the address book are browser-local because no profile or address endpoints exist yet. The login UI is one shared `/login` page that redirects by role after login (`ADMIN`, `VENDOR`, or customer); there are no separate customer, vendor, administrator, or manager login portals, and the role set is exactly `CUSTOMER`, `VENDOR`, and `ADMIN` (no `MANAGER` role).

### Vendors and products
- `POST /api/vendors/apply`
- `GET /api/admin/vendors/applications`
- `PATCH /api/admin/vendors/applications/:id`
- `GET /api/products`
- `GET /api/products/:identifier`
- `GET /api/products/mine`
- `POST /api/products`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id` (soft archive)
- `POST /api/uploads/images`

The public catalog supports pagination, search, price/rating/stock/sale filters, category/vendor/brand filters, sorting, and featured/bestseller/new-arrival/flash-deal filters. Public catalog requests return only published products. Vendors can manage only their own products; vendor-created products remain drafts. Admin publishing and archive permissions are enforced server-side.

Image uploads require server-side Cloudinary configuration. Password reset delivery requires Resend configuration.

### Orders (server-authoritative)
- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`

`POST /api/orders` requires authentication. Only published products can be ordered; draft or missing products are rejected. All prices, discounts, and order totals are computed server-side from the database; client-supplied monetary fields are ignored. Stock is decremented atomically together with order creation inside a MongoDB transaction: any validation or persistence failure aborts the transaction and rolls back every stock change, so no partial state remains. Variant selection matches the variant id and sufficient stock on the same array element (`$elemMatch`); a request exceeding the available stock for the selected variant fails with `409 OUT_OF_STOCK` without changing stock. Duplicate lines for the same product/variant are merged. An optional `Idempotency-Key` header (8–128 characters) enables safe retries: a unique index on `(userId, idempotencyKey)` guarantees that only one order is created per key even under concurrent requests, and retries return the original order with `idempotentReplay: true`. New orders start as `status: PENDING` and `paymentStatus: PENDING`. Tax and shipping are currently computed as zero pending explicit product decisions. The route is rate-limited (30 requests per 15 minutes per IP). Because order creation uses MongoDB transactions, the MongoDB deployment must run as a replica set (CI uses an ephemeral replica set; local environments must configure one).

`GET /api/orders` and `GET /api/orders/:id` are owner-scoped: users only see their own orders, and a request for another user's order returns `404`. Administrator or vendor order-management endpoints do not exist yet.

The frontend `ordersService` remains browser-local (localStorage) and is not yet wired to these endpoints; the checkout UI does not yet create real server-side orders.

## MongoDB databases

Use explicit database names in the connection URI:
- `rudin_store_dev` for local development.
- `rudin_store_test` for manual storefront testing; this Atlas database is seeded with clearly named test products.
- `rudin_store_integration_test` for the security integration suite only.
- `rudin_store_integration_test_orders` for the orders integration suite. It is derived automatically from the configured test URI so the two parallel suites cannot delete each other's data.

Each integration suite clears only its own database collections (`users`, `products`, `adminstates`, and for the orders suite also `orders`) at setup and teardown. A runtime guard and test assertion reject any database outside the `rudin_store_integration_test*` family when `RUN_MONGODB_INTEGRATION=true`. CI uses an ephemeral MongoDB replica set. Never run integration tests against the manual-test or production database.

## Domains not yet fully integrated

These areas still need backend models/routes, service wiring, authorization and end-to-end tests before they can be considered real rather than mock-backed:
- Cart persistence and server-authoritative inventory checks/reservation.
- Frontend checkout wiring: connecting the browser-local `ordersService` and the checkout flow to the server-authoritative order API.
- Frontend logout and server-verified session restore: `GET /api/auth/me` is implemented but never called by the frontend; profile updates and the address book are browser-local.
- Order lifecycle beyond creation: status transitions, cancellation, and fulfillment workflows.
- Payment-provider integration, verified webhooks, refunds and payment reconciliation. Orders remain `paymentStatus: PENDING` until a real provider confirms payment; payment success must never be assumed.
- Customer address CRUD and ownership enforcement.
- Coupon validation/redemption and usage limits.
- Reviews and verified-purchase checks.
- Contact inquiries and notifications.
- Seller/admin dashboard order, coupon, payout, and settings screens. Product management and vendor-application review inside those dashboards are API-backed, but the admin orders and coupons tabs render mock data (coupon actions are in-memory only), and the seller order-fulfillment, payouts, and settings tabs are presentation-only (in-memory status changes, toast-only actions, mock vendor profile).
- Email verification and refresh-token rotation.

Do not trust client-supplied prices, stock, discount calculations, role claims, or payment-success flags. Sensitive checkout and order operations must be recalculated and authorized by the backend.

## Recommended next implementation order

Server-authoritative order creation, transactional inventory decrement, and idempotent order creation are already implemented (see Orders above). The remaining order of work is:

1. Persist cart server-side and re-check current product price/stock on every checkout operation.
2. Add payment-provider intents and verified webhook handling before marking orders paid.
3. Add addresses, coupons/redemptions, reviews, and contact inquiries.
4. Wire seller/admin order, coupon, payout and settings screens to their APIs.
5. Add end-to-end tests for ownership, concurrency, failed payments, stock conflicts, and order state transitions.
