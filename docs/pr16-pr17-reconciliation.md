# PR #16 / PR #17 Reconciliation

## Decision

Use `feature/manager-owner-hierarchy` (PR #16) as the authorization architecture baseline. Do not merge PR #16 and PR #17 directly.

## Canonical authorization contract

- The platform owner is the single `MANAGER`, created only through `POST /api/auth/bootstrap-manager`.
- Only the manager can appoint, disable, or change permissions for `ADMIN` accounts.
- Persist effective admin grants in `User.adminPermissions`; do not introduce a second `permissions` field.
- Keep the PR #16 permission vocabulary (`vendors:review`, `products:manage`) and extend it deliberately for additional capabilities only when the matching server routes and tests are integrated.
- Permission checks must be enforced on the server. The manager has all capabilities; an admin has only explicitly granted capabilities; other roles must be denied.
- The authenticated request context must re-read current role, status, and grants from MongoDB so revocation/disablement applies immediately.

## PR #17 changes to preserve after adaptation

- Coupon model and coupon routes, after replacing `COUPON_MANAGEMENT` with the canonical permission contract and validating redemption/usage-limit behavior.
- Order/admin-order changes only after reviewing the complete order model and route diff against the server-authoritative order implementation in PR #16. Preserve ownership checks, server-derived prices, transactional stock changes, and idempotency.
- The CI change from the rate-limited Public ECR image to `mongo:7`, including explicit failure diagnostics if MongoDB does not start.
- Security fixes that do not weaken or replace existing PR #16 coverage.

## Tests that must remain

Keep the comprehensive PR #16 integration scenarios for role-specific portals, manager bootstrap concurrency, registration role-escalation prevention, manager-only governance, admin permission boundaries, immediate revocation/disablement, product lifecycle, password-reset token rotation, and test-database isolation.

Add PR #17 coupon/order tests alongside those tests; do not replace the existing scenarios with a smaller suite. MongoDB integration tests must run only against the isolated `rudin_store_integration_test*` databases.

## Merge gate

Neither original PR should be merged until a reconciled branch passes TypeScript checks, all unit and MongoDB integration tests (with integration tests actually enabled in CI), production build, and a review of the final diff. A locally passing test run with MongoDB suites skipped is not sufficient evidence for the integration behavior.

## Implemented reconciliation (this branch)

The valid PR #17 coupon and order capabilities have been integrated into the canonical PR #16 authorization model:

- Permission vocabulary extended from `vendors:review` and `products:manage` with `coupons:manage` (coupon management) and `orders:manage` (read-only administrative order listing and detail). A new server-defined preset `operations` grants `coupons:manage` + `orders:manage`. The deny-wins server-side resolution and the `User.adminPermissions` storage are unchanged; no second permission field was introduced.
- `backend/models/coupon.model.ts` and `backend/routes/coupons.routes.ts` ported from PR #17 with `COUPON_MANAGEMENT` replaced by `coupons:manage`. Coupon codes are immutable after creation, discount math is computed server-side, redemption is atomic against the usage limit, and redemption is restricted to the caller's own order read from the database.
- `backend/routes/admin-orders.routes.ts` ported from PR #17 with `ORDER_MANAGEMENT` replaced by `orders:manage`; `serializeOrder` is now exported from `backend/routes/orders.routes.ts` for reuse. The admin order routes remain read-only by design; payment and fulfillment transitions stay future scope.
- Both routers are mounted in `backend/server.ts` with dedicated rate-limit buckets (`/api/coupons` 30 requests, `/api/admin/orders` 60 requests, per 15 minutes per IP). `/api/admin/orders` is mounted before the MANAGER-only `/api/admin` router so authorized admins are not rejected by its `requireRole("MANAGER")` guard.
- The partial unique index on `role: "MANAGER"` from PR #17 was adopted in `backend/models/user.model.ts` as a database-level single-manager invariant; the transactional bootstrap guard remains the primary application-level control.
- Rejected from PR #17: the competing `backend/lib/permissions.ts` symbolic permission system (`SELLER_MANAGEMENT`, `COUPON_MANAGEMENT`, ...), the separate `User.permissions` field, and the rewritten integration test suites, because adopting them would replace the canonical authorization model and weaken the existing security coverage. The PR #16 suites are preserved unchanged.
- New suite `backend/integration/coupons-orders.integration.test.ts` (dedicated `rudin_store_integration_test_coupons` database, port 4320) covers the `coupons:manage` and `orders:manage` permission boundaries (including the `operations` preset and cross-permission denial), coupon code immutability and duplicate-code rejection, inactive/expired/below-minimum coupon rejection, atomic usage-limit consumption, ownership-scoped redemption, read-only administrative order visibility with address-safe listings, and cross-customer order isolation.

## Current status

The reconciliation implementation above is complete on this branch. It has not yet been verified by CI or by a local test run: the TypeScript check, the unit and MongoDB integration suites (including the new coupons-orders suite), and the production build must actually be executed before the merge gate below is satisfied. This document does not claim passing checks for the reconciled changes.
