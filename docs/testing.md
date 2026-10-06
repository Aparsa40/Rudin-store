# Testing and Validation

**Version:** 2.0.0

## Current State

Rudin Store 2.0.0 currently uses TypeScript validation and production build validation as its primary automated checks.

There is no dedicated unit/integration test suite in the current repository baseline.

The existence of this document does not imply that automated application tests exist.

---

## TypeScript Validation

Run:

```bash
npm run lint
```

The current script executes:

```bash
tsc --noEmit
```

This validates TypeScript types without generating output.

Current migration result:

```text
PASS
```

---

## Production Build

Run:

```bash
npm run build
```

The production build validates:

- module resolution
- TypeScript compilation through the build pipeline
- Vite transformation
- asset generation
- production bundling

Current migration result:

```text
PASS
```

The build currently reports a bundle-size warning for a JavaScript chunk above the default 500 kB warning threshold.

This warning does not currently fail the build.

---

## Formatting Validation

Run:

```bash
npm run format:check
```

To automatically format files:

```bash
npm run format
```

---

## Dependency Installation

For a clean dependency installation:

```bash
npm ci
```

This uses the committed `package-lock.json`.

---

## Manual Validation

Until a dedicated test suite exists, important user flows should be manually checked:

### Catalog

- Product listing
- Search
- Category filtering
- Product detail
- Vendor navigation

### Cart

- Add product
- Change quantity
- Remove product
- Vendor grouping
- Wishlist/save-for-later behavior
- Coupon behavior

### Checkout

- Address selection
- Delivery selection
- Payment simulation
- Order confirmation

### Authentication

- Login
- Registration
- Logout
- Protected route behavior
- Demo authentication behavior

### Seller

- Seller dashboard
- Product management
- Seller state changes

### Admin

- Admin dashboard
- Vendor management
- Product management
- Coupon management

---

## Future Automated Tests

When a test framework is introduced, priority should be given to pure business logic:

1. Order ID consistency.
2. Coupon expiration.
3. Coupon minimum purchase.
4. Coupon maximum discount.
5. Stock validation.
6. Published product filtering.
7. Review verification behavior.
8. Role/route guard behavior.
9. Cart totals.
10. Multi-vendor shipping calculations.

The project should prefer focused tests over a large test suite with low-value UI coverage.

---

## Test Status

```text
TypeScript validation: PASS
Production build:      PASS
Formatting:            PASS
Automated unit tests:  NOT IMPLEMENTED
E2E tests:             NOT IMPLEMENTED
```

Do not claim that the application is fully tested until automated tests exist and have been executed.
