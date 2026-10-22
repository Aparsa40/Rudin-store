# Changelog

All notable changes to Rudin Store are documented here.

The project follows Semantic Versioning as described in VERSIONING.md.

---

## Unreleased

Backend, test, and documentation work merged to the default branch after the v2.1.0 frontend candidate. Not yet assigned to a release version.

### Added — Backend (Node.js/Express/MongoDB)

- Cloudinary signed upload security: each signature is bound to a server-generated public ID with overwrite disabled; the signature quota supports the maximum 30-item product gallery; MOV delivery is converted to MP4 for broader browser playback.
- Authentication API: registration (always CUSTOMER), login, `GET /api/auth/me`, scrypt password hashing, one-hour bearer tokens, token invalidation on password change and account status/authVersion changes.
- One-time manager bootstrap (`POST /api/auth/bootstrap-manager`, `X-Manager-Bootstrap-Secret` header, `MANAGER_BOOTSTRAP_SECRET`) creating the single primary platform owner, with a transactional singleton guard so concurrent attempts cannot create a second manager.
- Password reset request/confirm with single-use hashed expiring tokens (delivery via Resend).
- Vendor applications and administrator approval with role escalation to VENDOR.
- Product catalog with pagination, search, price/rating/stock/sale, category/vendor/brand, featured/bestseller/new-arrival/flash-deal filters; product authoring with ownership and role enforcement; vendor-created products forced to DRAFT; publish/archive restricted to administrators; public catalog restricted to PUBLISHED products.
- Cloudinary product-media uploads using authenticated, rate-limited signatures scoped to user-specific folders; direct browser-to-Cloudinary uploads for JPEG/PNG/WebP/GIF images and MP4/WebM/MOV videos; product video metadata persistence and product-detail playback. The API secret stays server-side; the legacy 4 MB image endpoint remains for backward compatibility.
- Server-authoritative order API (provider-independent):
  - `POST /api/orders` — authenticated order creation; prices, subtotals, and total computed exclusively from database product prices; client-supplied monetary fields ignored; only PUBLISHED products are orderable; stock decrements and order persistence run in one MongoDB transaction (any failure rolls back every decrement); variant stock matched with `$elemMatch`; optional `Idempotency-Key` header protected by a unique partial index on `(userId, idempotencyKey)` with duplicate-key races replaying the committed order; every order is created `status: PENDING` and `paymentStatus: PENDING`.
  - `GET /api/orders` and `GET /api/orders/:id` — owner-scoped order history; other users' orders return 404.
  - Rate limiting: 30 requests per 15 minutes per IP on `/api/orders`.
- Health endpoint and per-endpoint rate limiting on sensitive auth/bootstrap/upload routes.
- Role-specific login portals (`POST /api/auth/customer/login`, `/vendor/login`, `/admin/login`, `/manager/login`) sharing one credential-verification path: wrong-role accounts receive the same generic error as unknown accounts (no privileged-account enumeration), the vendor portal additionally requires an approved vendor application, and each portal path has its own rate-limit bucket.
- Manager-owned role hierarchy: the `MANAGER` is the primary platform owner (bootstrap-only) and exclusively governs `ADMIN` accounts. The Manager Console lists admins and invitations, sends invitations through `POST /api/admin/invitations`, and handles final approval/rejection through `POST /api/admin/invitations/:id/approve` and `/reject`; invitees explicitly verify the one-time email token and choose their own password through `POST /api/admin-invitations/verify` and `/accept`. There is no direct admin-creation endpoint. The manager can update permissions and status through `PATCH /api/admin/admins/:id/permissions` and `/status`. Admins hold server-resolved granular permissions (`vendors:review`, `products:manage`, `coupons:manage`, `orders:manage`; presets `vendor-support`, `catalog-curator`, and `operations`; deny-wins resolution), cannot self-escalate, and cannot reach the governance area.
- Role-hierarchy revision of the earlier least-privilege design (still unreleased): the manager was elevated to primary platform owner, admins became manager-appointed with granular permissions, `POST /api/auth/bootstrap-admin` and the `/api/admin/managers` endpoints were removed, and admin status changes no longer carry a last-active-admin guard because only the manager — who cannot be disabled through the API — governs admin accounts.
- Coupon API (server-authoritative): `POST /api/coupons` (create; uppercase immutable codes, PERCENTAGE/FIXED/FREE_SHIPPING shape validation, duplicate code → 409 `COUPON_CODE_IN_USE`), `GET /api/coupons` (management listing), `PATCH /api/coupons/:id` (updates with the merged shape re-validated), `POST /api/coupons/validate` (unauthenticated preview), and `POST /api/coupons/redeem` (owner-scoped redemption against the database order subtotal; the per-order redemption claim and the usage-counter increment commit in one MongoDB transaction, repeated or concurrent redemptions for the same order are idempotent replays of the recorded claim, a different coupon on an already-redeemed order returns 409 `COUPON_ALREADY_REDEEMED`, and failed redemptions claim and consume nothing). Management routes require the manager or an admin holding the new `coupons:manage` permission; 30 requests per 15 minutes per IP on `/api/coupons`.
- Read-only administrative order visibility: `GET /api/admin/orders` (paginated/filterable listing that omits shipping addresses and idempotency keys) and `GET /api/admin/orders/:id` (full detail), gated by the new `orders:manage` permission (the manager always passes); no order mutation endpoints were added. 60 requests per 15 minutes per IP on `/api/admin/orders`.
- Effective `adminPermissions` exposure on authentication responses: login, portal login, and `GET /api/auth/me` payloads now include the server-resolved effective permission list for administrative accounts — the full permission catalog for the manager, the granted and sanitized list for an admin, and no field for every other role — so clients can render permission-aware interfaces without trusting local state; a backward-compatible field addition with no schema or token changes.
- Permission vocabulary extended with `coupons:manage` and `orders:manage` plus the `operations` preset (`coupons:manage` + `orders:manage`), reusing the existing deny-wins server-side resolution and `User.adminPermissions` storage; no second permission system was introduced.
- Database-level single-manager invariant: a partial unique index on `role: "MANAGER"` now backs the transactional bootstrap guard in `user.model.ts`.

- Phase 1 Manager console (Manager-owned operations):
  - `GET /api/admin/metrics` — MANAGER-only, server-computed platform snapshot: customers (active/disabled), vendors and pending applications, products by status, orders by status, non-cancelled gross booked revenue, and active coupons; no client-supplied value influences any figure.
  - `GET /api/admin/customers` and `PATCH /api/admin/customers/:id/status` — MANAGER-only customer directory (paginated, escaped search, status filter) and enable/disable of CUSTOMER accounts only; the target role is loaded and validated server-side inside the transaction (ADMIN/MANAGER/VENDOR targets: 403 `NOT_A_CUSTOMER`), redundant changes return 409 `STATUS_CONFLICT`, and both disabling and re-enabling bump `authVersion` so all previously issued session tokens are revoked immediately.
  - `GET /api/admin/products` — read-only, permission-gated (`products:manage`) cross-vendor catalog oversight; no mutation logic is duplicated from the existing product endpoints.
  - `GET /api/admin/audit-logs` — MANAGER-only, read-only audit history with exact-match action/actor and createdAt-range filters; audit records are never editable or deletable through the API.
  - `POST /api/admin/invitations/:id/resend` — MANAGER-only (5 requests per 15 minutes): reissues the one-time invitation token for invitations still in the INVITED state, rotating `tokenHash` inside the same transaction as the `admin.invitation.resent` audit record; the workflow state is validated before the email-configuration gate (503 `EMAIL_NOT_CONFIGURED` without token rotation), and a delivery failure after the committed rotation returns 502 `EMAIL_DELIVERY_FAILED` with a diagnostic audit record while the invitation remains resendable.
  - AuditLog model (`backend/models/audit-log.model.ts`) with createIndex-only index declarations (no existing index is dropped or modified) and a two-tier audit helper (`backend/lib/audit.ts`): reliable-tier audit writes join the caller's MongoDB transaction so the sensitive mutation and its audit record commit together or not at all (customer status changes, admin permission/status changes, invitation approve/reject, vendor application decisions, resend token rotation), while diagnostic-tier writes are best-effort records next to already-committed mutations (product status changes, invitation creation, resend email failures) surfaced through logged errors and never silently swallowed. No TTL exists yet; the retention policy remains an open product decision.

### Added — Frontend

- Independent login portals `/login` (customer), `/vendor/login`, `/admin/login`, `/manager/login`, each with its own branding, copy, validation, and post-login destination, built on one shared accessible `LoginForm` component and a central portal configuration.
- Role-aware `ProtectedRoute`: unauthenticated visitors are redirected to the correct portal with their destination preserved; authenticated users with the wrong role are routed to their own home area.
- Manager Console at `/manager`: administrator governance (appoint admins with permission presets, apply presets, enable/disable accounts) and vendor-application review through the real API; no mock data. The header account menu links to the real portal sign-in pages (`/login`, `/vendor/login`, `/admin/login`, `/manager/login`) and role-aware dashboard shortcuts instead of switching simulated roles; the demo-role switcher remains development-only (`VITE_ENABLE_DEMO_AUTH=true` and development builds).
- Permission-aware Admin Dashboard at `/admin`, fully wired to the real API: the orders tab uses the read-only administrative order listing with pagination and the server-supported filters (status, paymentStatus, orderNumber) and opens order details through the detail endpoint; the coupons tab lists, creates (server-validated, immutable codes), and toggles coupons through the coupon API with list state updated only from server responses; every dashboard section renders only when the authenticated administrator holds the matching permission (`vendors:review`, `products:manage`, `orders:manage`, `coupons:manage`), with fail-closed behavior for missing or malformed permission data, a retryable failed-verification state that hides every section when verification fails, an access-restricted state for permission denials, and an expired-session state for 401 responses; permissions are re-verified through `GET /api/auth/me` on load so stale local grants are corrected by the server. The fabricated overview metrics (fake GMV, take rate, health/schema claims) were removed in favor of truthful, permission-gated counts from the live API, and the `mockOrders`/`mockCoupons` imports were removed from the production dashboard path.

- Phase 1 Manager console completion at `/manager`: a Platform overview metrics section (customers, vendors, pending applications, products by status, orders and booked revenue, active coupons) from `GET /api/admin/metrics`; a customer directory with search/status filters and enable/disable actions wired to `PATCH /api/admin/customers/:id/status`; read-only product oversight; read-only audit history with an action filter; and a Resend action for INVITED invitations — all through a new transport-injected `managerApi` module (`src/services/admin/managerApi.ts`) that validates payloads strictly instead of degrading malformed responses, with no client-supplied prices, roles, or identifiers trusted. The invalid Tailwind classes `min-w-760px`/`min-w-700px` were corrected to `min-w-[760px]`/`min-w-[700px]`.

### Added — Frontend (Phase 1: bilingual storefront)

- Bilingual English/Persian localization foundation with no new runtime dependencies: a Zustand-backed language store in `src/i18n/` persists the validated preference under a dedicated `rudin-language-storage` key (separate from the cart and auth stores so language switching never disturbs cart or session state), English remains the default, missing keys fall back to documented English text, `<html lang>`/`<html dir>` stay in sync (`ltr`/`rtl`), and prices, numbers, and dates format through the standard `Intl` API for the active locale (`en-US`/`fa-IR`). Product IDs, API field names, URLs, and database values remain language-independent; database content (product titles, category names, vendor descriptions) is displayed as stored and never auto-translated.
- Header language selector offering English and فارسی with accessible listbox semantics, a notifications entry rendering an honest empty state (no fabricated notification counts), a translated account dropdown with the real portal sign-in links, a real cart entry with actual persisted cart counts, a translated search bar, and a navigation row (categories dropdown from the real category service, all products, flash deals, bestsellers, vendors, sell-on-Rudin) linking only to existing routes.
- Homepage redesigned as focused, reusable section components following the conceptual wireframe: configuration-driven announcement bar and hero carousel (previous/next controls, slide indicators, configurable automatic rotation, pause on hover and focus, visitor-controlled pause toggle, reduced-motion support), trust strip, flash deals from the real `flashDeal` catalog filter with a countdown rendered only from genuine `flashDealEndsAt` product deadlines, category shortcuts from the real category service, top sellers from the real bestseller filter, a configuration-driven mid-page banner, featured catalog tabs (trending/bestsellers/new arrivals) each loading independently from its real endpoint, vendor spotlight from the vendor service with honest placeholders for missing banner/logo data and ratings shown only when the vendor record carries review data, and a newsletter strip presented in an honest disabled state (no simulated subscription success). The previous fabricated flash-deal countdown, hardwired single-product deal, and fake newsletter success were removed.
- Every data-driven homepage section owns its loading, empty, and error states with retry actions; no prices, discounts, inventory, sales figures, campaign data, or notification counts are ever fabricated.
- Global reduced-motion support and a Persian system-font fallback in `src/index.css`; RTL layouts use Tailwind logical utilities (`start-*`, `end-*`, `ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`) with direction-aware arrows, chevrons, and gradients.
- Frontend unit tests for the localization core (English default, persisted-value validation with safe English fallback, direction/locale mapping, parameter interpolation, English fallback for missing keys, English/Persian key parity, non-empty values, dedicated storage key), locale formatting (prices, numbers, dates, countdown padding and expiry), homepage configuration (existing routes only, complete bilingual copy, unique slide ids, configurable rotation, no external image URLs), and hero carousel logic (index wrap-around, reduced-motion/pause-aware autoplay, safe index normalization).

### Added — Tests and CI

- `npm test` (`scripts/run-tests.mjs`) discovering every `*.test.ts` under `backend/` and `src/`; the runner loads local `.env` via `dotenv/config` and fails fast in CI if MongoDB integration-test configuration is missing, preventing a green run with silently skipped integration suites.
- Backend unit tests: product validation, rate limiter behavior, image upload decoding.
- Frontend unit test for the browser-local `ordersService` (honest PENDING/payment states, no fabricated tracking, empty history by default).
- MongoDB integration suites, skipped unless `RUN_MONGODB_INTEGRATION=true`:
  - security suite (`rudin_store_integration_test`): authentication, disabled/revoked token rejection, role boundaries, concurrent manager bootstrap (exactly one manager), manager-appointed administrators with permission presets, vendor approval, product lifecycle and cross-vendor ownership, public catalog PUBLISHED-only.
  - orders suite (dedicated `rudin_store_integration_test_orders` database, port 4318): unauthenticated/invalid payload rejection, server-computed totals with client totals ignored, DRAFT rejection, out-of-stock rollback, variant mismatch (`$elemMatch`), sequential and concurrent idempotent replay, persistence-failure rollback, cross-user isolation.
  - login-portals suite (dedicated `rudin_store_integration_test_portals` database, port 4319): per-portal role matching with generic errors, pending/rejected vendor applicants on the vendor portal, public-registration role-escalation prevention, manager-owned governance with admin permission-preset enforcement (including self-escalation denial), disabled-admin and expired-token rejection, password-reset credential rotation.
  - coupons-orders suite (dedicated `rudin_store_integration_test_coupons` database, port 4320): `coupons:manage`/`orders:manage` permission boundaries with cross-permission denial, coupon code immutability and duplicate rejection, inactive/expired/below-minimum rejection, atomic usage-limit consumption, ownership-scoped redemption, one-coupon-per-order redemption with idempotent replays, read-only admin order listing/detail with invalid-filter rejection, and cross-customer order isolation.
  - coupon-redemption suite (dedicated `rudin_store_integration_test_redeem` database, port 4321): concurrent duplicate redemption idempotency for a single order, single-consumption enforcement of a `usageLimit` of one across concurrent attempts on different orders, percentage rounding, FIXED-capped-at-subtotal math, FREE_SHIPPING zero-discount semantics, and not-yet-valid rejection without consumption.
  - Manager-console integration suite (dedicated `rudin_store_integration_test_manager_console` database, port 4322): MANAGER-only access boundaries for metrics/customers/audit-logs, `products:manage` scoping for catalog oversight, server-side role validation for customer status changes (including ADMIN and VENDOR targets), session revocation via `authVersion`, reliable-tier audit coupling assertions, the invitation-resend state machine including its email-configuration gate without token rotation, and non-regression of the existing Manager invitation, admin governance, and vendor-review flows.- Frontend unit test for the role-specific portal configuration (`src/config/authPortals.test.ts`).
- Frontend unit tests for the admin dashboard permission model (`src/config/adminPermissions.test.ts`): section-to-permission mapping, manager full access, granted-permission presets, fail-closed sanitization of missing or malformed permission data, non-admin rejection, and the verification lifecycle (malformed payloads fail closed, failed re-verification drops stale grants, and successful retry restores sections).
- Frontend unit tests for the admin API client (`src/services/admin/adminApi.test.ts`): order query building, strict payload parsing that rejects malformed responses while preserving valid empty results, error propagation (401/403/400/409) without fake success, coupon creation body normalization (uppercase codes, FREE_SHIPPING without a value, maxDiscount only for PERCENTAGE), and isActive toggling through the supported PATCH mutation with state derived from the server response.
- Login-portals integration assertions extended to the effective `adminPermissions` exposure: the granted list on admin login and `me`, the full catalog on manager login, and the omitted field for customer registration.
- Runtime database guard: integration mode refuses any database other than `rudin_store_integration_test` (or a dedicated `rudin_store_integration_test_*` derivation used by a parallel suite).
- GitHub Actions CI: TypeScript check (tsc + full test suite against an ephemeral MongoDB replica set) and production build on pull requests and pushes to the main branch.
- CI observability: the test runner (`scripts/run-tests.mjs`) now captures the runner output while still streaming it live and, on failure, emits the clearest failure lines as GitHub annotations plus a tail excerpt in the job summary, so failing integration tests are visible on the job page without raw log access. Test discovery order, behavior, and exit codes are unchanged.

### Fixed

- Fail-closed Admin Dashboard permission verification: when the `GET /api/auth/me` re-verification fails (network error, server error, or a malformed response), every administrative section stays hidden behind a descriptive, retryable error state instead of rendering from stale persisted permissions; the backend remains the authoritative authorization boundary.
- The admin API client now rejects malformed orders and coupons listing payloads with descriptive errors instead of degrading them to empty lists, so the dashboard surfaces an error with a retry action rather than a false "no data" state; valid empty arrays remain legitimate empty results.
- Repaired the UTF-8 mojibake (corrupted em/en dashes and arrows) that a prior encoding fault introduced into `CHANGELOG.md`, `README.md`, `backend/README.md`, and the `backend/routes/auth.routes.ts` validation-message strings; remote content was re-verified character by character after the repair.

### Documentation

- `backend/README.md`: API reference including the server-authoritative orders section and test guidance.
- `docs/server-authoritative-checkout.md`: order API design, deliberate non-goals, and the open product decisions (payment provider, currency, tax, shipping, coupons, multi-vendor splitting, order lifecycle).
- Root README, docs index, backend-integration contract, and testing guide updated to match the implemented system (Phase D documentation accuracy pass): the frontend `ordersService` is documented as browser-local and not connected to the order API, and unimplemented domains are explicitly listed.
- Frontend integration status correction pass: only the login and registration forms call the auth API (session restore reads local state and never calls `GET /api/auth/me`; logout, profile updates, and the address book are browser-local); admin orders/coupons and seller order-fulfillment/payout/settings screens are documented as mock or presentation-only; the shared role-redirecting `/login` page and the `CUSTOMER`/`VENDOR`/`ADMIN` role set are documented as the current authentication UI (no separate role portals, no `MANAGER` role).
- Admin dashboard integration documentation pass: root README integration/project-status tables and `backend/README.md` now document the wired, permission-aware admin dashboard (real administrative order and coupon APIs, permission-gated sections, effective `adminPermissions` on authentication responses) and its new frontend unit tests, while the seller order-fulfillment/payout/settings screens remain documented as presentation-only.
- `docs/manager-console.md`: the Phase 1 Manager console API reference — endpoint authorization and rate limits, the two-tier audit model, frontend wiring, the integration-suite coverage, and the integration port registry (4317-4322).

### Validation

Verified through GitHub Actions CI on pull requests to the main branch (TypeScript Check: `tsc --noEmit` plus the complete unit and integration test suite against an ephemeral MongoDB replica set; Production Build: `vite build`). Local runs were not performed by the automation; CI artifacts are the authoritative record.

### Known limitations

- No payment provider, verified payment callbacks, currency/tax/shipping/coupon rules, order lifecycle workflows, or seller payouts; orders can only be created PENDING and never become PAID.
- The frontend checkout/order flow still uses browser-local storage and does not call the order API.
- Frontend session restore, logout, profile updates, and the address book are browser-local; the frontend never calls `GET /api/auth/me` except for the admin dashboard's permission re-verification; the seller dashboard order, payout, and settings tabs remain mock or presentation-only.
- MongoDB transactions require a replica-set or sharded deployment; a standalone `mongod` cannot serve order or admin-critical operations.

---

## [2.1.0] — Release Candidate

Version 2.1.0 is the hardening upgrade currently under review in release/v2.1.0.

### Added — v2.1.0

- ProtectedRoute for account, seller, and admin route UX protection.
- Explicit demo-role support for CUSTOMER, VENDOR, and ADMIN.
- products.service.ts service barrel.
- Coupon validity-window support through validFrom and validUntil.

### Improved — v2.1.0

- Authentication starts unauthenticated instead of with a fake pre-authenticated customer.
- Auth store, login flow, and header use the same v2.1 API.
- Cart operations validate available stock before increasing quantities.
- Save-for-later restoration respects stock.
- Coupon validation checks active state, validity dates, minimum purchase, percentage limits, and maximum discount.
- Vendor, coupon, and product demo persistence is more consistent.
- TypeScript strict and filename-casing checks are enabled.
- The conflicting Tailwind flex + block utility combination in Header was removed.

### Documentation — v2.1.0

- Updated all repository documentation from the v2.0.0 baseline to the v2.1.0 candidate.
- Documented the boundary between demo/local behavior and trusted backend behavior.
- Documented planned authentication, cart/checkout, Contact Us, and PostgreSQL integration.
- Documented favicon/logo integration as a pending branding step.

### Validation — v2.1.0

    npm ci       PASS — 0 vulnerabilities reported
    npm run lint PASS
    npm run build PASS

The production build has a non-blocking JavaScript chunk-size warning above Vite's default 500 kB threshold.

### Security / Architecture Notes

v2.1.0 still uses mock/demo authentication, browser persistence, and frontend route guards. Production work remains required for server authentication/authorization, secure sessions, transactional inventory, real payments, shipping, payouts, and contact/email backend services. (The unreleased backend in this changelog's Unreleased section addresses authentication, authorization, and transactional inventory; payments and the remaining domains are still open.)

---

## [2.0.0] — 2026-10-06

### Added — v2.0.0

- Multi-vendor marketplace frontend architecture.
- Domain-oriented service layer.
- Authentication, cart, wishlist, coupon, order, review, vendor, and category services.
- Global UI state management.
- Reusable UI primitives and technical documentation.

### Improved — v2.0.0

- Product browsing and filtering.
- Product detail experience.
- Multi-vendor cart and checkout workflows.
- Customer, seller, and admin workflows.
- Authentication state handling.
- Service-layer separation and TypeScript contracts.

---

## [1.0.0]

Initial documented frontend baseline.
