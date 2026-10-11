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

## MongoDB databases

Use explicit database names in the connection URI:
- `rudin_store_dev` for local development.
- `rudin_store_test` for manual storefront testing; this Atlas database is seeded with clearly named test products.
- `rudin_store_integration_test` for automated MongoDB integration tests only.

The integration test clears documents from `users`, `products`, and `adminstates`. A runtime guard and test assertion reject any other database when `RUN_MONGODB_INTEGRATION=true`. CI uses an ephemeral MongoDB replica set. Never run integration tests against the manual-test or production database.

## Domains not yet fully integrated

These areas still need backend models/routes, service wiring, authorization and end-to-end tests before they can be considered real rather than mock-backed:
- Cart persistence and server-authoritative inventory checks/reservation.
- Checkout and order creation/history, order status, cancellation and fulfillment.
- Payment-provider integration, verified webhooks, refunds and payment reconciliation.
- Customer address CRUD and ownership enforcement.
- Coupon validation/redemption and usage limits.
- Reviews and verified-purchase checks.
- Contact inquiries and notifications.
- Remaining seller/admin order, coupon, payout, and settings screens.
- Email verification and refresh-token rotation.

Do not trust client-supplied prices, stock, discount calculations, role claims, or payment-success flags. Sensitive checkout and order operations must be recalculated and authorized by the backend.

## Recommended next implementation order

1. Persist cart server-side and re-check current product price/stock on every checkout operation.
2. Add order/order-item models and transactional inventory reservation.
3. Add payment-provider intents and verified webhook handling before marking orders paid.
4. Add addresses, coupons/redemptions, reviews, and contact inquiries.
5. Wire seller/admin order, coupon, payout and settings screens to their APIs.
6. Add end-to-end tests for ownership, concurrency, failed payments, stock conflicts, and order state transitions.
