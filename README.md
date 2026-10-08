# Rudin Store

## Multi-Vendor E-Commerce Frontend

**Version:** 2.1.0  
**Status:** Release candidate / API-ready frontend prototype

Rudin Store is a multi-vendor marketplace frontend built with React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, and Zustand 5.

Version 2.1.0 is a hardening upgrade over v2.0.0. It improves client-side authentication state, protected routes, cart stock validation, coupon validation, and local mock-data persistence while preserving the existing UI and service-oriented architecture.

> **Important:** v2.1.0 is still a frontend prototype. It does not provide production authentication, server-side authorization, a production database, real payment processing, shipping-provider integration, seller payouts, or transactional inventory.

## v2.1.0 Highlights

- Application version synchronized to 2.1.0.
- Unauthenticated default auth state instead of a fake logged-in customer.
- Explicit demo authentication and CUSTOMER/VENDOR/ADMIN role workflows.
- ProtectedRoute guards for account, seller, and admin UX.
- Cart stock validation for add/update/save-for-later flows.
- Coupon validation for status, validity dates, minimum purchase, percentage limits, and maximum discount.
- Local persistence improvements for demo authentication, vendors, coupons, and products.
- Products service barrel added.
- TypeScript strict and cross-platform filename-casing checks enabled.
- Tailwind flex/block conflict in the mobile vendor link removed.

## Architecture

    React Pages / Components
              |
              v
        Zustand Stores
              |
              v
        Domain Services
              |
              v
    Mock Data / Local Persistence
              |
              +---- future HTTPS API ----> Backend
                                           |
                                           +--> PostgreSQL
                                           +--> Auth / Sessions
                                           +--> Orders / Inventory
                                           +--> Payments
                                           +--> Contact / Email

The service layer is the intended integration boundary. UI components should not connect directly to databases or provider APIs.

## Running Locally

Requirements: Node.js and npm.

    npm ci
    npm run dev
    npm run lint
    npm run format
    npm run format:check
    npm run build
    npm run preview

## Validation Status

The v2.1.0 candidate was validated locally with:

    npm ci       PASS — 0 vulnerabilities reported
    npm run lint PASS
    npm run build PASS

The production build emits a non-blocking warning because the main JavaScript chunk exceeds Vite's default 500 kB warning threshold.

There is currently no dedicated unit or E2E test suite. See docs/testing.md.

## Production Integration Roadmap

### Authentication

Connect login, registration, logout, password reset, session refresh/revocation, and current-user loading to a trusted backend. The backend must verify credentials and enforce authorization.

### Cart and Checkout

Connect server-side stock and price validation, coupon validation, cart persistence, address management, shipping calculation, order creation, payment authorization, and transaction status.

### Contact Us

The repository does not currently contain a production contact backend. A future Contact Us flow should submit to a backend endpoint, persist the inquiry, apply rate/spam controls, and use a controlled email or ticket integration.

### Database

PostgreSQL is the recommended production relational database. The backend should own users, sessions, vendors, products, variants, inventory, carts, addresses, coupons, orders, payments, reviews, contact inquiries, and audit events.

No production database is connected in v2.1.0.

## Branding and Browser Assets

Branding assets are now part of the v2.1.0 release branch.

- Header logo: `public/branding/header-logo.svg`
- Footer logo: `public/branding/footer-logo.svg`
- Social preview artwork: `public/branding/og-image.svg`
- Browser favicon: `public/favicon.ico`
- PNG favicons: `public/favicon-16x16.png`, `public/favicon-32x32.png`
- Apple touch icon: `public/apple-touch-icon.png`
- PWA icons: `public/icons/android-chrome-192x192.png`, `public/icons/android-chrome-512x512.png`
- Web manifest: `public/site.webmanifest`

`index.html` references the favicon, Apple touch icon, manifest, Open Graph image, and Twitter image. The header and footer use their dedicated logo variants.

## Security Boundary

Frontend validation and ProtectedRoute are UX protections, not backend security. The browser is untrusted.

See SECURITY.md, docs/security.md, and docs/backend-integration.md.

## Project Status

| Area | v2.1.0 |
|---|---|
| Frontend UI | Implemented |
| Mock/demo architecture | Implemented |
| Client route guards | Implemented |
| Cart stock validation | Implemented |
| Coupon validation | Implemented |
| Production authentication | Not implemented |
| Backend authorization | Not implemented |
| Production database | Not connected |
| Payment gateway | Not implemented |
| Shipping provider | Not implemented |
| Seller payouts | Not implemented |
| Contact backend/email | Not implemented |

Rudin Store v2.1.0 is a hardened, API-ready frontend prototype, not a complete production marketplace backend.

## Documentation

See CHANGELOG.md, CONTRIBUTING.md, SECURITY.md, VERSIONING.md, and the docs/ directory.

## License

See LICENSE.
