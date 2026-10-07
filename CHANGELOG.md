# Changelog

All notable changes to Rudin Store are documented here.

The project follows Semantic Versioning as described in VERSIONING.md.

---

## [2.1.0] — Release Candidate

Version 2.1.0 is the hardening upgrade currently under review in release/v2.1.0.

### Added

- ProtectedRoute for account, seller, and admin route UX protection.
- Explicit demo-role support for CUSTOMER, VENDOR, and ADMIN.
- products.service.ts service barrel.
- Coupon validity-window support through validFrom and validUntil.

### Improved

- Authentication starts unauthenticated instead of with a fake pre-authenticated customer.
- Auth store, login flow, and header use the same v2.1 API.
- Cart operations validate available stock before increasing quantities.
- Save-for-later restoration respects stock.
- Coupon validation checks active state, validity dates, minimum purchase, percentage limits, and maximum discount.
- Vendor, coupon, and product demo persistence is more consistent.
- TypeScript strict and filename-casing checks are enabled.
- The conflicting Tailwind flex + block utility combination in Header was removed.

### Documentation

- Updated all repository documentation from the v2.0.0 baseline to the v2.1.0 candidate.
- Documented the boundary between demo/local behavior and trusted backend behavior.
- Documented planned authentication, cart/checkout, Contact Us, and PostgreSQL integration.
- Documented favicon/logo integration as a pending branding step.

### Validation

    npm ci       PASS — 0 vulnerabilities reported
    npm run lint PASS
    npm run build PASS

The production build has a non-blocking JavaScript chunk-size warning above Vite's default 500 kB threshold.

No dedicated unit/E2E suite is currently implemented.

### Security / Architecture Notes

v2.1.0 still uses mock/demo authentication, browser persistence, and frontend route guards. Production work remains required for server authentication/authorization, secure sessions, PostgreSQL, transactional inventory, real payments, shipping, payouts, and contact/email backend services.

---

## [2.0.0] — 2026-10-06

### Added

- Multi-vendor marketplace frontend architecture.
- Domain-oriented service layer.
- Authentication, cart, wishlist, coupon, order, review, vendor, and category services.
- Global UI state management.
- Reusable UI primitives and technical documentation.

### Improved

- Product browsing and filtering.
- Product detail experience.
- Multi-vendor cart and checkout workflows.
- Customer, seller, and admin workflows.
- Authentication state handling.
- Service-layer separation and TypeScript contracts.

---

## [1.0.0]

Initial documented frontend baseline.

## Unreleased

Changes not yet assigned to a release version belong here.
