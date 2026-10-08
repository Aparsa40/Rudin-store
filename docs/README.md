# Rudin Store Documentation

**Documentation version:** 2.1.0

This directory contains technical and operational documentation for the v2.1.0 release candidate.

## Documentation Map

### Architecture

- architecture.md
- frontend-architecture.md
- component-system.md

### Development

- development.md

### Backend

- backend-integration.md

### Testing

- testing.md

### Security

- security.md

### Versioning

- versioning.md

### Branding

- branding.md

## v2.1.0 Status

Implemented:

- unauthenticated default auth state
- explicit demo roles
- client-side protected routes
- cart stock validation
- coupon validation
- local demo persistence improvements
- strict TypeScript checking

Still outside the frontend:

- production backend
- production authentication
- server-side authorization
- production database
- real payments
- shipping provider
- seller payouts
- production contact/email delivery

## Validation

    npm ci
    npm run lint
    npm run build

Latest candidate result:

    npm ci       PASS — 0 vulnerabilities reported
    npm run lint PASS
    npm run build PASS

No dedicated unit/E2E suite is currently implemented.

## Documentation Rule

Documentation must describe the implementation that actually exists. Do not document mock behavior as a real external integration.
