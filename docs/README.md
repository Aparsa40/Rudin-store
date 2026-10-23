# Rudin Store Documentation

**Documentation version:** 2.1.0

This directory contains technical and operational documentation for the repository. The v2.1.0 frontend release candidate and the unreleased Node.js/Express/MongoDB backend (see the Unreleased section of the root CHANGELOG.md) are both documented here.

## Documentation Map

### Architecture

- architecture.md
- frontend-architecture.md
- component-system.md

### Development

- development.md

### Backend and API

- backend-integration.md — implemented API boundary and remaining integration work
- server-authoritative-checkout.md — order API design, behavior, and open product decisions
- manager-console.md — Phase 1 Manager console endpoints: metrics, customer management, catalog oversight, audit history, invitation resend
- backend/README.md (repository root, `backend/README.md`) — API reference: authentication, administrators, products, orders

### Testing

- testing.md

### Security

- security.md

### Versioning

- versioning.md

### Branding

- branding.md

## Status

Implemented (v2.1.0 frontend):

- unauthenticated default auth state
- explicit demo roles
- client-side protected routes
- cart stock validation
- coupon validation
- local demo persistence improvements
- strict TypeScript checking

Implemented on the backend (unreleased):

- authentication, administrator bootstrap/management, vendor approval, and product catalog with server-side authorization
- server-authoritative, transactional, idempotent order creation and owner-scoped order history
- automated unit and MongoDB-backed integration tests plus GitHub Actions CI
- Manager console Phase 1: platform metrics, customer directory with enable/disable, cross-vendor catalog oversight, audit history, and invitation resend

Still not implemented:

- payment provider and verified payment callbacks
- currency, tax, shipping, and coupon product decisions
- order cancellation/refund/fulfillment workflows
- server-side cart persistence, addresses, reviews, contact backend
- frontend wiring of the checkout/order flow to the order API (`ordersService` remains browser-local)
- seller payouts, shipping provider, email verification, refresh-token rotation

## Validation

    npm ci
    npm run lint
    npm test
    npm run build

`npm test` runs the backend unit tests, the frontend ordersService unit test, and (when `RUN_MONGODB_INTEGRATION=true` with a MongoDB replica set) all six MongoDB integration suites. CI executes all of these on every pull request; see testing.md for the database-isolation rules and the latest verified results.

## Documentation Rule

Documentation must describe the implementation that actually exists. Do not document mock behavior as a real external integration, and do not describe unfinished work as production-ready.
