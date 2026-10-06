# Changelog

All notable changes to Rudin Store are documented in this file.

The project follows Semantic Versioning as described in `VERSIONING.md`.

---

## [2.0.0] — 2026-10-06

### Added

- Multi-vendor marketplace frontend architecture.
- Domain-oriented service layer.
- Authentication service/store separation.
- Cart service and cart state management.
- Wishlist service and wishlist state management.
- Coupon service.
- Order service.
- Review service.
- Vendor service.
- Category service.
- Global UI state management.
- Reusable Badge component.
- Reusable Drawer component.
- Reusable Modal component.
- Reusable RatingStars component.
- Reusable ToastContainer component.
- CartDrawer component.
- QuickViewModal component.
- SearchBar component.
- Frontend architecture documentation.
- Component system documentation.
- Backend integration documentation.
- Prettier formatting configuration.

### Improved

- Product browsing and filtering.
- Product detail experience.
- Multi-vendor cart presentation.
- Checkout workflow.
- Customer account workflow.
- Seller dashboard workflow.
- Admin dashboard workflow.
- Authentication state handling.
- Shared UI component consistency.
- Service-layer separation.
- TypeScript domain contracts.
- Project documentation.

### Validation

The release was validated using:

```text
npm install       PASS
npm ci            PASS
npm run format    PASS
npm run lint      PASS
npm run build     PASS

The production build completes successfully.

A bundle-size warning remains for a JavaScript chunk exceeding Vite's default 500 kB warning threshold.

Security / Architecture Notes

Version 2.0.0 remains a frontend prototype.

The following are simulated or mock implementations:

Authentication

Authorization

Payments

Shipping

Payouts

Escrow

Backend persistence

External provider integrations

Frontend route guards must not be considered a replacement for backend authorization.

[1.0.0]

Initial documented frontend baseline.

The 1.x line represents the previous frontend implementation before the version 2 architecture and service-layer expansion.

Unreleased

Changes that are not yet part of a released version belong here.

Versioning

See VERSIONING.md for the project's release and versioning policy.

```
