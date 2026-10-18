# Rudin Store

## Multi-Vendor E-Commerce Application

**Version:** 2.1.0 (per package.json)  
**Status:** Frontend release candidate plus an unreleased Node.js/Express/MongoDB backend under active development

Rudin Store is a multi-vendor marketplace built with React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, and Zustand 5 on the frontend, and Node.js (Express, Mongoose) against MongoDB on the backend.

The v2.1.0 frontend is a hardening upgrade over v2.0.0: unauthenticated default auth state, protected routes, cart stock validation, coupon validation, and local demo-data persistence. Backend work (authentication, administrators, vendors, products, server-authoritative orders, tests, CI) has been merged to the default branch but is **not yet part of a released version**; see the Unreleased section of CHANGELOG.md.

> **Important:** This is not a complete production marketplace. There is no payment-provider integration, no verified payment callbacks, no shipping-provider integration, no seller payouts, no server-side coupon engine, no order lifecycle (cancellation/refund/fulfillment) workflows, and the frontend checkout/order flow is not yet connected to the server order API.

## Architecture

```text
React Pages / Components
        |
        v
   Zustand Stores
        |
        v
  Domain Services  ------------------------------+
        |                                         |
        v (browser-local demo data)               v (HTTP, VITE_API_URL)
  Mock Data / localStorage              Express backend (backend/)
                                               |
                                               v
                                     Mongoose --> MongoDB (replica set)
```

The service layer is the integration boundary. UI components must not connect directly to databases or provider APIs. The browser must never receive database credentials.

## Frontend service integration status

| Frontend service                                                                           | Backend integration                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth — role-specific portal logins and registration                                        | Real API (`POST /api/auth/customer/login`, `POST /api/auth/vendor/login`, `POST /api/auth/admin/login`, `POST /api/auth/manager/login`, `POST /api/auth/register`; the generic `POST /api/auth/login` remains for backward compatibility)                                                                                                                                        |
| Auth — session restore (`getCurrentUser`), logout, profile updates                         | **Browser-local only**; `GET /api/auth/me` is implemented but never called by the frontend; logout performs no server call                                                                                                                                                                                                                                                       |
| Address book                                                                               | **Browser-local only** (`localStorage` with mock fallback); no backend address endpoints exist                                                                                                                                                                                                                                                                                   |
| Public product catalog, search, filters, details                                           | Real API                                                                                                                                                                                                                                                                                                                                                                         |
| Seller product management (create, edit, status, archive, image/GIF/video gallery uploads) | Real API                                                                                                                                                                                                                                                                                                                                                                         |
| Admin catalog moderation (featured toggle) and vendor-application review                   | Real API                                                                                                                                                                                                                                                                                                                                                                         |
| Admin dashboard — orders, coupons, and permission-gated sections                           | Real API (`GET /api/admin/orders`, `GET /api/admin/orders/:id`, `GET /api/coupons`, `POST /api/coupons`, `PATCH /api/coupons/:id`); each section renders only for administrators holding the matching permission, and permissions are re-verified through `GET /api/auth/me` on load; the previous `mockOrders`/`mockCoupons` rendering is removed from the production dashboard |
| Seller order fulfillment, payouts, and store settings                                      | **Mock / presentation-only**; in-memory order status, toast-only payout/settings actions, mock vendor profile                                                                                                                                                                                                                                                                    |
| Vendor application and admin approval                                                      | Real API                                                                                                                                                                                                                                                                                                                                                                         |
| Orders / checkout                                                                          | **Browser-local only** (`localStorage`); not connected to `/api/orders`                                                                                                                                                                                                                                                                                                          |
| Cart, coupons, wishlist, reviews                                                           | Browser-local demo data                                                                                                                                                                                                                                                                                                                                                          |

The frontend `ordersService` persists orders in `localStorage` only. The server-authoritative order API (`POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`) exists, but the checkout UI does not call it yet, so a browser order is not a server order. See docs/server-authoritative-checkout.md and backend/README.md.

Authentication UI: the frontend has independent login portals — `/login` (customer), `/vendor/login`, `/admin/login`, and `/manager/login` — plus `/register` and `/reset-password`. Each portal submits only to its own backend endpoint, which rejects credentials whose account role does not match the portal, and routes success to its own destination (`/account`, `/seller/dashboard`, `/admin`, and `/manager` respectively). The backend role set is `CUSTOMER`, `VENDOR`, `ADMIN`, and `MANAGER`: the manager is the single primary platform owner, created only through the controlled bootstrap, and appoints admins with granular permissions (`vendors:review`, `products:manage`, `coupons:manage`, `orders:manage`; see backend/README.md for the permission matrix); the admin dashboard renders each section only when the authenticated administrator holds the matching permission, with the backend remaining the authoritative enforcer. The header account menu links to these real portal pages rather than switching simulated roles. The dev-only demo-role buttons (`VITE_ENABLE_DEMO_AUTH=true`, development builds only) create browser-local demo sessions that do not call the API and must never be treated as real authentication.

## Running locally

Requirements: Node.js and npm.

```bash
npm ci
npm run dev          # Vite frontend on port 3000
npm run server:dev   # Express API on port 4000 (needs local .env)
npm run lint
npm run format
npm run format:check
npm test
npm run build
npm run preview
```

Server configuration is documented in .env.example (variable names only; keep real values in the ignored local `.env`).

## Validation status

GitHub Actions CI (`.github/workflows/ci.yml`) runs on every pull request and push to the main branch:

- **TypeScript Check** — `npm ci`, `npm run lint` (tsc), then `npm test` against an ephemeral MongoDB replica set.
- **Production Build** — `npm ci`, `npm run build`.

`npm test` (scripts/run-tests.mjs) discovers every `*.test.ts` under `backend/` and `src/`:

- Backend unit tests: product validation, rate limiting, upload validation.
- Frontend unit tests: ordersService (browser-local behavior, honest payment states), admin permission resolution (fail-closed section gating), and the admin API client (query building, strict payload parsing that rejects malformed responses, error propagation, coupon mutations).
- MongoDB integration suites (skipped unless `RUN_MONGODB_INTEGRATION=true`): security (auth, roles, bootstrap, vendor approval, product lifecycle), orders (server-authoritative pricing, transactional stock rollback, concurrent idempotency, variant matching, cross-user isolation), and login-portals (per-portal role matching, vendor-portal applicant restrictions, registration role-escalation prevention, manager-owned governance with permission-preset enforcement, disabled/expired credentials, password-reset revocation).

See docs/testing.md for the database-isolation rules.

The production build emits a non-blocking warning because the main JavaScript chunk exceeds Vite's default 500 kB warning threshold.

## Production integration roadmap

### Implemented on the backend (unreleased)

Authentication with scrypt password hashing and bearer tokens, including role-specific login portals for customer, vendor, administrator, and manager accounts; a one-time manager bootstrap that creates the single primary platform owner, guarded by a transactional singleton against concurrent bootstrap attempts; manager-owned administrator governance (the manager appoints admins and exclusively controls their granular permission presets); vendor applications and manager/administrator approval; product catalog, authoring, ownership, and archive; Cloudinary signed image/GIF/video uploads; password reset via Resend; server-authoritative order creation (transactional, idempotent) and owner-scoped order history.

### Not implemented

Payment-provider integration and verified callbacks; currency, tax, shipping, and coupon product decisions; order cancellation/refund/fulfillment; server-side cart persistence; customer address CRUD; reviews; contact backend/email; seller payouts; refresh-token rotation and email verification; frontend wiring of `GET /api/auth/me`, server-side logout, profile updates, and the address book.

### Database

MongoDB is the database. MongoDB transactions require a replica set (or sharded cluster); a standalone `mongod` cannot run the transactional order or admin operations. The earlier PostgreSQL recommendation in the frontend roadmap is superseded by the implemented MongoDB backend.

## Branding and browser assets

- Header logo: `public/branding/header-logo.svg`
- Footer logo: `public/branding/footer-logo.svg`
- Social preview artwork: `public/branding/og-image.svg`
- Browser favicon: `public/favicon.ico`
- PNG favicons: `public/favicon-16x16.png`, `public/favicon-32x32.png`
- Apple touch icon: `public/apple-touch-icon.png`
- PWA icons: `public/icons/android-chrome-192x192.png`, `public/icons/android-chrome-512x512.png`
- Web manifest: `public/site.webmanifest`

`index.html` references the favicon, Apple touch icon, manifest, Open Graph image, and Twitter image. The header and footer use their dedicated logo variants.

## Security boundary

Frontend validation and ProtectedRoute are UX protections, not backend security. The browser is untrusted; the backend re-validates everything (roles, ownership, prices, stock, totals).

See SECURITY.md, docs/security.md, docs/backend-integration.md, and backend/README.md.

## Project status

| Area                                                                                             | Status                                                                                                                                           |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend UI                                                                                      | Implemented                                                                                                                                      |
| Demo/local persistence architecture                                                              | Implemented                                                                                                                                      |
| Client route guards                                                                              | Implemented (UX only)                                                                                                                            |
| Frontend auth session wiring (logout, profile, addresses, `/api/auth/me`)                        | Browser-local except the admin dashboard, which re-verifies the account and its permissions through `GET /api/auth/me` on load                   |
| Admin orders/coupons and seller fulfillment/payout/settings screens                              | Admin dashboard wired to the real API with permission-gated sections; seller fulfillment/payout/settings screens remain mock / presentation-only |
| Backend authentication/authorization (auth, admin, vendors, products, orders)                    | Implemented, unreleased                                                                                                                          |
| Role-specific login portals and manager-owned governance (admin appointment, permission presets) | Implemented, unreleased                                                                                                                          |
| MongoDB backend + transactional inventory                                                        | Implemented, unreleased; replica set required                                                                                                    |
| Frontend checkout/order API wiring                                                               | Not implemented (browser-local orders)                                                                                                           |
| Payment gateway / verified callbacks                                                             | Not implemented                                                                                                                                  |
| Currency / tax / shipping / coupon rules                                                         | Not implemented (open product decisions)                                                                                                         |
| Order lifecycle (cancel/refund/fulfillment)                                                      | Not implemented                                                                                                                                  |
| Shipping provider / seller payouts                                                               | Not implemented                                                                                                                                  |
| Contact backend/email                                                                            | Not implemented                                                                                                                                  |
| Email verification / refresh-token rotation                                                      | Not implemented                                                                                                                                  |

Rudin Store is a functional marketplace prototype with a partially integrated backend, not a production-ready marketplace.

## Documentation

See CHANGELOG.md, CONTRIBUTING.md, SECURITY.md, VERSIONING.md, backend/README.md, and the docs/ directory (architecture.md, backend-integration.md, server-authoritative-checkout.md, testing.md, security.md, development.md, versioning.md, branding.md).

## License

See LICENSE.
