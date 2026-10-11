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

| Frontend service | Backend integration |
|---|---|
| Auth (login, register, me) | Real API |
| Public product catalog, search, filters, details | Real API |
| Seller/admin product management | Real API |
| Vendor application and admin approval | Real API |
| Orders / checkout | **Browser-local only** (`localStorage`); not connected to `/api/orders` |
| Cart, coupons, wishlist, reviews, addresses | Browser-local demo data |

The frontend `ordersService` persists orders in `localStorage` only. The server-authoritative order API (`POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`) exists, but the checkout UI does not call it yet, so a browser order is not a server order. See docs/server-authoritative-checkout.md and backend/README.md.

## Running locally

Requirements: Node.js and npm.

    npm ci
    npm run dev          # Vite frontend on port 3000
    npm run server:dev   # Express API on port 4000 (needs local .env)
    npm run lint
    npm run format
    npm run format:check
    npm test
    npm run build
    npm run preview

Server configuration is documented in .env.example (variable names only; keep real values in the ignored local `.env`).

## Validation status

GitHub Actions CI (`.github/workflows/ci.yml`) runs on every pull request and push to the main branch:

- **TypeScript Check** — `npm ci`, `npm run lint` (tsc), then `npm test` against an ephemeral MongoDB replica set.
- **Production Build** — `npm ci`, `npm run build`.

`npm test` (scripts/run-tests.mjs) discovers every `*.test.ts` under `backend/` and `src/`:

- Backend unit tests: product validation, rate limiting, upload validation.
- Frontend unit test: ordersService (browser-local behavior, honest payment states).
- MongoDB integration suites (skipped unless `RUN_MONGODB_INTEGRATION=true`): security (auth, roles, bootstrap, vendor approval, product lifecycle) and orders (server-authoritative pricing, transactional stock rollback, concurrent idempotency, variant matching, cross-user isolation).

See docs/testing.md for the database-isolation rules.

The production build emits a non-blocking warning because the main JavaScript chunk exceeds Vite's default 500 kB warning threshold.

## Production integration roadmap

### Implemented on the backend (unreleased)

Authentication with scrypt password hashing and bearer tokens; first-admin bootstrap and admin management with a transactional singleton guard; vendor applications and admin approval; product catalog, authoring, ownership, and archive; Cloudinary image uploads; password reset via Resend; server-authoritative order creation (transactional, idempotent) and owner-scoped order history.

### Not implemented

Payment-provider integration and verified callbacks; currency, tax, shipping, and coupon product decisions; order cancellation/refund/fulfillment; server-side cart persistence; customer address CRUD; reviews; contact backend/email; seller payouts; refresh-token rotation and email verification.

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

| Area | Status |
|---|---|
| Frontend UI | Implemented |
| Demo/local persistence architecture | Implemented |
| Client route guards | Implemented (UX only) |
| Backend authentication/authorization (auth, admin, vendors, products, orders) | Implemented, unreleased |
| MongoDB backend + transactional inventory | Implemented, unreleased; replica set required |
| Frontend checkout/order API wiring | Not implemented (browser-local orders) |
| Payment gateway / verified callbacks | Not implemented |
| Currency / tax / shipping / coupon rules | Not implemented (open product decisions) |
| Order lifecycle (cancel/refund/fulfillment) | Not implemented |
| Shipping provider / seller payouts | Not implemented |
| Contact backend/email | Not implemented |
| Email verification / refresh-token rotation | Not implemented |

Rudin Store is a functional marketplace prototype with a partially integrated backend, not a production-ready marketplace.

## Documentation

See CHANGELOG.md, CONTRIBUTING.md, SECURITY.md, VERSIONING.md, backend/README.md, and the docs/ directory (architecture.md, backend-integration.md, server-authoritative-checkout.md, testing.md, security.md, development.md, versioning.md, branding.md).

## License

See LICENSE.
