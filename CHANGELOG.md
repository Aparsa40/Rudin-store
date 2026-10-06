# Changelog

All notable changes to Rudin Store are documented in this file.

The project follows [Semantic Versioning](VERSIONING.md).

---

## [Unreleased]

### Planned

- Resolve the Vite/esbuild dependency compatibility issue.
- Introduce an automated testing framework.
- Add unit tests for core domain services and state management.
- Improve CI validation.
- Continue separating prototype/mock behavior from production integrations.
- Document backend integration contracts.

---

## [2.1.0]

### Changed

- Applied production-hardening improvements to authentication and authorization flows.
- Added protected route handling.
- Improved role-aware frontend access control.
- Replaced the fixed demo OTP with generated simulated OTP behavior.
- Improved stock validation during cart and checkout flows.
- Improved coupon validation and validity-period handling.
- Improved product publication filtering.
- Added category slug handling.
- Improved search suggestions.
- Improved review purchase-verification behavior.
- Improved mock payment and shipping messaging to make simulated behavior explicit.
- Added persistence improvements to product and vendor services.

### Added

- Protected route component.

### Known Limitations

- Backend authentication and authorization are not implemented.
- Payment gateways are not integrated.
- Shipping providers are not integrated.
- Seller and admin dashboards still contain prototype/mock behavior.
- Some frontend state and mock-data paths require further consolidation.

---

## [2.0.0]

### Added

- Expanded frontend service layer.
- Expanded Zustand state management.
- Additional reusable UI components.
- Additional product, vendor, cart, order, coupon, review, wishlist, and authentication abstractions.
- Frontend architecture and component-system documentation.

### Changed

- Major evolution of the original v1 frontend architecture.
- Increased separation between UI components and domain/service logic.

---

## [1.0.0]

### Added

- Initial Rudin Store frontend prototype.
- React and TypeScript application foundation.
- Vite-based development and production build setup.
- Product and marketplace UI.
- Mock data architecture.
- Initial service abstraction layer.
- Initial Zustand state management.
- Initial routing and page structure.

### Baseline Notes

The original `v1.0.0` dependency manifest contains an incompatibility between the declared Vite and esbuild versions.

Running:

```bash
npm ci
```

against the unmodified baseline currently fails with npm `ERESOLVE`.

This issue is intentionally preserved in the historical `v1.0.0` snapshot and will be resolved in a subsequent maintenance release.