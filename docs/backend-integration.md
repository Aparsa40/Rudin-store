# Backend Integration Contract

This document defines the migration from mock/demo services to a production backend.

## Principle

Keep the UI contract stable and replace service implementations behind the existing service boundary.

    React UI
       ↓
    Zustand
       ↓
    Domain Service
       ↓
    API Client
       ↓
    Backend
       ↓
    PostgreSQL

The browser must never connect directly to PostgreSQL.

## Authentication

Current: authService and authStore provide demo/local authentication.

Production endpoints:

    POST /api/auth/register
    POST /api/auth/login
    POST /api/auth/logout
    POST /api/auth/refresh
    POST /api/auth/forgot-password
    POST /api/auth/reset-password
    GET  /api/auth/me

The backend must hash passwords, manage sessions, rate-limit authentication, validate credentials, and enforce roles/permissions.

## Protected Routes

ProtectedRoute remains useful for UX, but every protected API endpoint must verify authenticated session, required permission, and resource ownership.

## Cart and Inventory

Current cartService/cartStore perform client-side stock checks.

Production endpoints:

    GET  /api/cart
    POST /api/cart/items
    PATCH /api/cart/items/:id
    DELETE /api/cart/items/:id
    POST /api/cart/coupons
    DELETE /api/cart/coupons/:code

The server must re-check stock and current price on every sensitive operation.

## Checkout and Orders

Recommended endpoints:

    POST /api/checkout/validate
    POST /api/orders
    GET  /api/orders
    GET  /api/orders/:id
    POST /api/orders/:id/cancel

Order creation and inventory reservation should use a database transaction.

## Payments

Use a trusted backend boundary:

    Frontend
       ↓
    Backend payment endpoint
       ↓
    Payment provider
       ↓
    Verified webhook
       ↓
    Backend order/payment state

Never trust a browser-only payment-success flag.

## Addresses

    GET    /api/account/addresses
    POST   /api/account/addresses
    PATCH  /api/account/addresses/:id
    DELETE /api/account/addresses/:id

Ownership must be checked server-side.

## Vendors and Products

    GET  /api/products
    GET  /api/products/:id
    GET  /api/vendors
    GET  /api/vendors/:slug
    POST /api/vendor/products
    PATCH /api/vendor/products/:id
    DELETE /api/vendor/products/:id

Seller operations require server-side vendor ownership checks.

## Coupons

Production validation must check active state, validity window, minimum purchase, discount type, maximum discount, customer eligibility, and usage limits.

## Reviews

    GET  /api/products/:id/reviews
    POST /api/products/:id/reviews
    PATCH /api/reviews/:id
    DELETE /api/reviews/:id

The backend should derive verified-purchase status from order history.

## Contact Us

Recommended endpoint:

    POST /api/contact

Backend responsibilities:

1. validate and normalize the message
2. rate-limit and apply spam controls
3. persist the inquiry
4. optionally notify a controlled support mailbox/ticket system
5. return a non-sensitive confirmation ID

Current status: no production contact backend exists in v2.1.0.

## Database

PostgreSQL is the recommended relational database.

Initial logical domains:

    users
    sessions
    roles / permissions
    vendors
    products
    product_variants
    inventory
    addresses
    carts
    cart_items
    coupons
    coupon_redemptions
    orders
    order_items
    payments
    reviews
    contact_inquiries
    audit_events

The backend owns migrations, constraints, indexes, transactions, and access control.

## API Client

Introduce one shared API client for base URL, credentials/cookies, JSON handling, error normalization, abort/timeout, and authentication refresh behavior.

Avoid scattering raw fetch calls across React components.

## Recommended Integration Order

1. Backend project + PostgreSQL
2. Database schema/migrations
3. Authentication/session API
4. API client + authStore integration
5. Products/vendors APIs
6. Cart + inventory APIs
7. Checkout + orders
8. Payment provider + webhooks
9. Addresses/account APIs
10. Reviews/coupons
11. Contact API + email/ticket integration
12. Seller/admin authorization and audit logging

Do not mark an integration complete until the backend is authoritative for that domain.
