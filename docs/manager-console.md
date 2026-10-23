# Manager Console (Phase 1)

**Scope:** the completed Phase 1 Manager console endpoints and the `ManagerDashboard` wiring. The backend remains the sole authorization boundary; the frontend only renders server responses.

## Endpoints

All new routes are MANAGER-owned or permission-gated, mounted before the MANAGER-only `/api/admin` router in `backend/server.ts` so authorized admins are not rejected by the `requireRole('MANAGER')` guard. Each mounted path carries its own rate limiter (60 requests per 15 minutes per IP, except where noted).

### Platform metrics — `GET /api/admin/metrics`

- MANAGER-only (`requireRole('MANAGER')`).
- Read-only snapshot computed server-side from live collections: customers (active/disabled), vendors (total, pending applications), products by status, orders by status, non-cancelled order count, gross booked revenue (sum of server-computed `total`; no payment gateway exists yet), and currently active coupons. `generatedAt` is an ISO timestamp.
- No client-supplied value influences any figure.

### Customer directory — `GET /api/admin/customers`

- MANAGER-only. Paginated (`page`, `limit` ≤ 100, default 20), optional `status` (`ACTIVE`/`DISABLED`, otherwise 400 `INVALID_QUERY`) and an escaped `search` over email/first name/last name.
- Returns summary fields only: id, email, names, status, `createdAt`, `lastLoginAt`, `vendorApplicationStatus`.

### Customer status — `PATCH /api/admin/customers/:id/status`

- MANAGER-only. Body: `{ status: 'ACTIVE' | 'DISABLED' }`; a non-object body or any other status returns 400 `INVALID_STATUS`.
- The target's role is loaded inside the transaction and must be `CUSTOMER`; ADMIN, MANAGER, and VENDOR targets return 403 `NOT_A_CUSTOMER` and are never modified. Missing targets return 404 `CUSTOMER_NOT_FOUND`. A redundant change returns 409 `STATUS_CONFLICT`.
- Both disabling and re-enabling bump `authVersion`, so every previously issued session token is revoked immediately.
- The mutation, the session revocation, and the audit record (`admin.customer.status_changed`) commit in one MongoDB transaction: a failed audit write rolls the change back.

### Catalog oversight — `GET /api/admin/products`

- Gated by `requirePermission('products:manage')`: the primary MANAGER passes, and an ADMIN passes only when granted the permission. Strictly read-only; publish/archive/edit/delete remain on the existing product endpoints, so this listing never duplicates their business logic.
- Paginated with optional `status` (`DRAFT`/`PUBLISHED`/`ARCHIVED`), `vendorId`, and an escaped `search` over title/brand name/slug. Returns summary fields only.

### Audit history — `GET /api/admin/audit-logs`

- MANAGER-only, strictly read-only. Paginated with optional exact-match `action` and `actorId` filters plus a `from`/`to` `createdAt` range (invalid values: 400 `INVALID_QUERY`).
- Audit records are written only next to the action they describe and are never editable or deletable through the API.

### Invitation resend — `POST /api/admin/invitations/:id/resend`

- MANAGER-only (inside the `/api/admin` router), rate limited to 5 requests per 15 minutes per IP.
- Workflow state is validated before the email-configuration checks: an unknown invitation returns 404 `INVITATION_NOT_FOUND`, and only invitations still in `INVITED` state can be resent (409 `INVITATION_NOT_RESENDABLE` otherwise). A server without `RESEND_API_KEY`/`EMAIL_FROM` returns 503 `EMAIL_NOT_CONFIGURED` without rotating the token.
- A successful resend rotates `tokenHash` inside a transaction together with the `admin.invitation.resent` audit record (invalidating the previous link immediately, 48-hour expiry window restarted), then sends the email. If delivery fails after the rotation committed, the response is 502 `EMAIL_DELIVERY_FAILED`, a diagnostic `admin.invitation.resent_email_failed` record is written, and the invitation stays `INVITED` and resendable.

## Audit model

`backend/models/audit-log.model.ts` stores security-relevant administrative actions: actor id/role, stable dotted action, target type/id, and a free-form metadata object. Indexes (`actorId`, `action`, `createdAt`, `actorId + createdAt`) are declared with createIndex semantics only — no existing index is dropped or modified. There is no TTL yet; the retention policy is an open product decision.

`backend/lib/audit.ts` provides the two tiers:

- Reliable tier (`recordAudit` with a session): the audit write joins the caller's transaction, so the sensitive mutation and its audit record commit together or not at all. Used for: customer status changes, admin permission changes, admin status changes, invitation approval/rejection, vendor application decisions, invitation resend token rotation.
- Diagnostic tier (`recordAuditDiagnostic`): best-effort write after the primary mutation has already committed (product status changes, invitation creation, resend email-delivery failures). Failures are surfaced through `console.error`, never silently swallowed, and do not roll back the committed mutation.

## Frontend wiring

`src/services/admin/managerApi.ts` is a thin, transport-injected API module (mirroring the existing `adminApi.ts` pattern) with strict payload validation: malformed responses raise descriptive errors instead of degrading to fabricated results. `src/pages/ManagerDashboard.tsx` renders: a Platform overview metrics section, the customer directory with search/status filters and enable/disable actions, read-only product oversight with status filtering, read-only audit history with an action filter, and a Resend action for `INVITED` invitations. No client-supplied prices, roles, or identifiers are trusted anywhere.

## Tests

`backend/integration/manager-console.integration.test.ts` (dedicated `rudin_store_integration_test_manager_console` database, port 4322) verifies end to end: MANAGER-only access to metrics/customers/audit-logs, `products:manage` scoping for catalog oversight, server-side role validation for customer status changes (including ADMIN/VENDOR targets), session revocation via `authVersion`, transactional audit coupling, the resend state machine with its configuration gating, and non-regression of the existing Manager invitation and admin governance flows.

## Port registry for integration suites

4317 security, 4318 orders, 4319 login-portals, 4320 coupons-orders, 4321 coupon-redemption, 4322 manager-console. Every suite owns a unique API port so a server of another suite that is still shutting down can never collide.
