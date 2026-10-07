# Testing and Validation

**Version:** 2.1.0

## Current State

Rudin Store currently relies on TypeScript validation, production builds, dependency installation checks, and manual workflow validation.

There is no dedicated unit, integration, or E2E test suite yet.

## Dependency Installation

    npm ci

The v2.1 candidate's latest local run completed successfully and reported 0 vulnerabilities.

## TypeScript Validation

    npm run lint

This executes tsc --noEmit.

v2.1.0 candidate result: PASS.

Strict TypeScript checking is enabled.

## Production Build

    npm run build

v2.1.0 candidate result: PASS.

The build emits a non-blocking warning because the main JavaScript chunk exceeds Vite's default 500 kB warning threshold.

## Formatting

    npm run format:check
    npm run format

## Manual Validation Priorities

### Authentication

- default state is logged out
- demo login/register
- logout
- protected account route
- seller/admin role navigation
- unauthorized role navigation

### Catalog

- product listing
- search
- category filtering
- product detail
- vendor navigation

### Cart

- add product
- stock limit
- quantity update
- out-of-stock behavior
- save for later
- restore from save for later
- coupon validation

### Checkout

- address selection
- delivery selection
- payment simulation
- order confirmation

### Seller/Admin

- dashboard access
- product/vendor management
- coupon management

## Planned Focused Tests

When a lightweight test runner is introduced, prioritize:

1. order ID consistency
2. coupon validity window
3. coupon minimum purchase
4. coupon maximum discount
5. stock validation
6. published product filtering
7. review verification
8. ProtectedRoute role behavior
9. cart totals
10. multi-vendor shipping calculations

Do not claim automated coverage until tests exist and have actually run.
