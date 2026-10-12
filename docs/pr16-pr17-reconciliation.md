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

## Current status

This document records the reconciliation contract. It does not claim that coupon/order routes have already been ported or that CI has passed on the reconciliation branch.
