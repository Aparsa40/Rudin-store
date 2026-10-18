# Backend API: Authentication, administrators, products, and orders

## Authentication

- `POST /api/auth/register`: creates a customer account. Public registration cannot choose an elevated role.
- `POST /api/auth/login`: validates credentials against MongoDB and returns a one-hour bearer access token. Accepts every active role; kept for backward compatibility.
- `POST /api/auth/customer/login`, `POST /api/auth/vendor/login`, `POST /api/auth/admin/login`, `POST /api/auth/manager/login`: role-specific portal logins sharing one credential-verification path. Each portal rejects otherwise valid credentials when the account role does not match, and answers unknown accounts, wrong passwords, and wrong roles with the same generic error so portal visitors cannot enumerate privileged accounts. The vendor portal additionally requires an `APPROVED` vendor application, so pending or rejected applicants cannot sign in there.
- `GET /api/auth/me`: returns the currently authenticated account. Responses for `ADMIN` and `MANAGER` accounts include `adminPermissions`, the server-resolved effective permission list (the full catalog for the manager; the granted, sanitized list for an admin). Non-administrative accounts omit the field so clients fail closed when it is missing.
- `POST /api/auth/password-reset/request`: sends a single-use reset link through Resend. Configure server-side `RESEND_API_KEY` and `EMAIL_FROM`.
- `POST /api/auth/password-reset/confirm`: validates the reset token, changes the password, and invalidates existing access tokens.
- Passwords are hashed with Node.js scrypt and random per-password salts; plaintext passwords are never stored.
- Send protected API requests with `Authorization: Bearer <accessToken>`.
- The token secret must be at least 32 characters. Generate one in PowerShell:
  ```powershell
  [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
  ```
  Put it in the ignored local `.env` as `AUTH_TOKEN_SECRET`. Do not commit or share it.

## First manager bootstrap

The single primary `MANAGER` account must be created once using `POST /api/auth/bootstrap-manager`. Before starting the API, put a separate random value of at least 32 characters in local `.env` as `MANAGER_BOOTSTRAP_SECRET`. Send it in the `X-Manager-Bootstrap-Secret` header with a JSON body containing `email`, `password` (12–128 characters), and `firstName` (optional `lastName`). The route only works while no manager account exists: the existence and email checks plus the insert run inside the transactional singleton guard, concurrent attempts are serialized, and late arrivals receive `409 BOOTSTRAP_CLOSED`. A missing or incorrect secret receives an indistinguishable `404`. After success, remove `MANAGER_BOOTSTRAP_SECRET` from `.env` and restart the API. Never expose the bootstrap secret in a browser app or commit it.

## Administrator governance (manager-appointed)

All routes under `/api/admin` require the active primary `MANAGER` bearer token. Admin accounts can never reach this governance area, even when the manager granted them permissions.

- `GET /api/admin/admins`: list administrator accounts (never returns password hashes).
- `GET /api/admin/invitations`: list invitation history across `INVITED`, `EMAIL_VERIFIED`, `PENDING_APPROVAL`, `ACTIVE`, `REJECTED`, and `DISABLED` states without returning token or password hashes.
- `POST /api/admin/invitations`: create an invitation and send a one-time, 48-hour email link. The optional `permission` object is resolved server-side from `presets`, `allow`, and `deny`; client-supplied effective permissions are never trusted. A unique sparse `activeEmail` index prevents concurrent invitations for the same normalized email.
- `POST /api/admin/invitations/:id/approve`: create and activate an ADMIN only after the invitee verifies their email and accepts the invitation with their own password; this is the Manager's final approval step.
- `POST /api/admin/invitations/:id/reject`: reject an invitation and clear its active-email reservation.
- `POST /api/admin-invitations/verify` and `POST /api/admin-invitations/accept`: public invitee endpoints to verify the token and explicitly accept the invitation while setting a password. Tokens are stored only as SHA-256 digests and are single-use.
- There is intentionally no `POST /api/admin/admins` account-creation endpoint. Admins cannot be created by directly setting a password from the Manager Console.
- `PATCH /api/admin/admins/:id/permissions`: replace the admin's effective permissions wholesale from a server-side resolution. `deny` always wins over `presets` and `allow`, so revocation is explicit. Because the whole router is manager-only, admins cannot edit their own or anyone else's permissions.
- `PATCH /api/admin/admins/:id/status`: activate or disable an admin. Disabled admins lose access immediately because the middleware re-reads account status on every request.

## Manager ownership and admin permissions

The `MANAGER` role is the single primary platform owner and is not an alias for `ADMIN`. The manager appoints admin accounts, exclusively controls their permissions, and passes every permission check. Admin accounts hold only the granular permissions the manager explicitly granted; they cannot grant themselves permissions, cannot appoint other admins, and cannot touch the manager's authority. The permission set is currently `vendors:review` (list and decide vendor applications), `products:manage` (whole-catalog product authoring, publishing/archiving, and image uploads), `coupons:manage` (coupon creation, management listing, and updates), and `orders:manage` (read-only administrative order listing and detail). Permission matrix, enforced server-side on every request:

| Capability                                                     | MANAGER      | ADMIN                       | VENDOR                     | CUSTOMER              |
| -------------------------------------------------------------- | ------------ | --------------------------- | -------------------------- | --------------------- |
| Govern admin invitations and existing admins (`/api/admin/invitations`, `/api/admin/admins`)            | Yes          | No (403)                    | No (403)                   | No (403)              |
| Review vendor applications (`/api/admin/vendors/applications`) | Yes          | Only with `vendors:review`  | No (403)                   | No (403)              |
| Create/publish/archive any product; upload images              | Yes          | Only with `products:manage` | Own products only (drafts) | No (403)              |
| Manage coupons (`/api/coupons` management routes)              | Yes          | Only with `coupons:manage`  | No (403)                   | No (403)              |
| View all orders (`/api/admin/orders`, read-only)               | Yes          | Only with `orders:manage`   | No (403)                   | No (403)              |
| Create an ADMIN or MANAGER through public registration         | Not possible | Not possible                | Via approved application   | Yes (always CUSTOMER) |

Server-defined presets give the manager a safe shorthand: `vendor-support` (`vendors:review`), `catalog-curator` (`vendors:review` + `products:manage`), and `operations` (`coupons:manage` + `orders:manage`). The resolved list is stored on the account, so future preset redefinitions never silently re-grant permissions to existing admins. Manager and admin accounts can never be created through public registration; the manager exists only via the controlled bootstrap.

## Product media uploads

- `POST /api/uploads/sign` requires an authenticated vendor, the manager, or an admin with `products:manage`; its JSON body is `{ "resourceType": "image" | "video" }`.
- The API returns a short-lived upload signature, the Cloudinary cloud name/API key, a timestamp, a server-selected user-specific folder, a server-generated public ID, `overwrite: false`, and a signed allow-list of formats. Each signature is bound to one asset ID; replaying it cannot create additional assets under new random IDs. The API secret is never returned.
- Upload directly to Cloudinary using `https://api.cloudinary.com/v1_1/<cloud-name>/<resource-type>/upload`, passing the returned signature fields plus the file. Do not send the Cloudinary API secret or place it in any `VITE_*` variable.
- Supported image formats: JPEG, PNG, WebP, GIF. Supported video formats: MP4, WebM, MOV. The seller UI enforces 20 MB/image and 100 MB/video client-side limits; configure provider-side upload/security controls for production enforcement.
- The legacy `POST /api/uploads/images` endpoint remains available for backward compatibility and accepts PNG/JPEG/WebP data URLs up to 4 MB.
- The signature endpoint is authenticated, permission-gated, and rate-limited to 40 signature requests per 15 minutes per IP, enough for the product maximum of 20 images and 10 videos. MOV uploads are delivered through Cloudinary's MP4 format transformation for wider browser playback. Product payload validation allows up to 20 images and 10 videos; MongoDB stores metadata and URLs only.

## Product catalog and authoring

- `GET /api/products`: published catalog with filters, sorting, and pagination.
- `GET /api/products/:identifier`: published product by ID or slug.
- `GET /api/products/mine`: returns all products for the current vendor, or the whole catalog for the manager or an admin holding `products:manage`.
- `POST /api/products`: requires the manager, an admin holding `products:manage`, or an active vendor. Catalog managers can publish a product and attribute it to a vendor; vendor-created products are forced to DRAFT. Public requests cannot create or publish products.
- `PATCH /api/products/:id`: updates a product with validation and owner checks. Only the manager or an admin holding `products:manage` can publish/archive products or change featured status.
- `DELETE /api/products/:id`: archives a product after an ownership or catalog-management authorization check.

Product CRUD/archive, vendor onboarding/ownership checks, signed Cloudinary image/GIF/video uploads, rate limiting, and password-reset API are implemented. The frontend login and registration forms and the seller/admin product-management flows call the API. The public storefront catalog service reads published products from the API, including search, price/rating/stock/sale filters, vendor/category filters, featured/bestseller/new-arrival/flash-deal lists, and product details. Within the dashboards, product management, vendor-application review, and the manager console's administrator governance are API-backed, and the admin dashboard is fully wired: its orders tab uses the read-only administrative order listing/detail API with pagination and server-supported filters, its coupons tab creates and toggles coupons through the coupon API (server-validated; codes are immutable), and every section renders only when the authenticated administrator holds the matching permission (`vendors:review`, `products:manage`, `orders:manage`, `coupons:manage`), with a fail-closed behavior for missing or malformed permission data and a retryable failed-verification state when `GET /api/auth/me` cannot be reached or returns a malformed response. The seller order-fulfillment, payouts, and settings tabs remain presentation-only.

## Orders (server-authoritative)

- `POST /api/orders` (authentication required): creates an order. The server:
  - resolves every item against **published** products only (DRAFT/ARCHIVED or unknown products return 400 `PRODUCT_NOT_FOUND`; variant products require a `variantId` via 400 `VARIANT_REQUIRED`/`VARIANT_NOT_FOUND`);
  - computes unit prices, subtotals, and the total **exclusively from database prices** — client-supplied monetary fields are ignored entirely;
  - decrements product and variant stock inside the **same MongoDB transaction** as the order insert, so insufficient stock (409 `OUT_OF_STOCK`), a duplicate idempotency key, or any persistence/validation failure rolls back every decrement and consumes no inventory;
  - matches variant stock with `$elemMatch`, so the variant identity and the sufficient-stock condition must hold on the same array element;
  - supports an optional `Idempotency-Key` header (8–128 characters). A unique partial index on `(userId, idempotencyKey)` makes idempotency race-safe: a replay or a concurrent duplicate returns 200 with `idempotentReplay: true` and the original order, never a second order or a second decrement;
  - creates every order as `status: PENDING` and `paymentStatus: PENDING`. No payment gateway exists, so no order can be born `PAID`; `paymentMethod` is a label only (CASH_ON_DELIVERY, CREDIT_CARD, PAYPAL, APPLE_PAY).
- `GET /api/orders` (authentication required): the authenticated user's own orders, newest first.
- `GET /api/orders/:id` (authentication required): owner-scoped lookup. Another user's order is indistinguishable from a missing one (404 `ORDER_NOT_FOUND`).
- Rate limiting: 30 requests per 15 minutes per IP on `/api/orders`.

Order creation uses MongoDB multi-document transactions, so the database must be a replica set (MongoDB Atlas or a local replica set); a standalone `mongod` cannot serve `POST /api/orders`. Tax and shipping are computed as zero until the corresponding product decisions are made (see `docs/server-authoritative-checkout.md`). The frontend checkout flow does **not** call these endpoints yet; the frontend `ordersService` remains browser-local.

## Coupons (server-authoritative)

- `POST /api/coupons` (manager, or an admin holding `coupons:manage`): creates a coupon. Codes are 3-40 characters of letters, digits, hyphens, or underscores and are stored uppercase; a duplicate code returns 409 `COUPON_CODE_IN_USE`. `type` is `PERCENTAGE` (value 1-100, optional positive `maxDiscount` cap), `FIXED` (positive value), or `FREE_SHIPPING` (value forced to 0). `minPurchaseAmount`, `description` (at most 200 characters), `validFrom`, a future `validUntil`, an optional integer `usageLimit` of at least 1, and `isActive` are validated server-side, and the cross-field shape rules are re-checked on every update.
- `GET /api/coupons` (manager, or an admin holding `coupons:manage`): management listing, newest first.
- `PATCH /api/coupons/:id` (manager, or an admin holding `coupons:manage`): updates the mutable fields; coupon codes are immutable (400), and the merged coupon shape is re-validated.
- `POST /api/coupons/validate` (unauthenticated preview): returns the coupon and the server-computed `discountAmount` for a preview cart amount, or a generic 404 for unknown, inactive, not-yet-started, expired, exhausted, or below-minimum codes.
- `POST /api/coupons/redeem` (authentication required): redeems a coupon against the caller's own order. The discount base is the order subtotal read from the database (ownership enforced by the `userId` filter; other users' orders are indistinguishable from missing ones). Exactly one coupon may be redeemed per order: the per-order redemption claim and the coupon's usage-counter increment are written together in a single MongoDB transaction (the same replica-set deployment the order-creation transaction requires), so repeated or concurrent requests for the same order can never consume a coupon twice. A repeated request for the same order and coupon is an idempotent replay (`alreadyRedeemed: true`) returning the recorded discount without re-consuming the usage limit; a different coupon on an already-redeemed order is refused with 409 `COUPON_ALREADY_REDEEMED`. The active state, validity window, and usage limit are re-checked atomically inside the transaction's update filter, so concurrent redemptions can never exceed `usageLimit`, and failed redemptions claim and consume nothing. The redeemed coupon is recorded on the order document (`couponRedemption` with `couponId`, `code`, `discount`, `redeemedAt`) and appears in the owner's order responses; a `FREE_SHIPPING` redemption records a zero monetary discount because no shipping cost is modeled yet. Redemption does not mutate order totals: order totals change only through a future checkout integration once payment rules are defined.
- Rate limiting: 30 requests per 15 minutes per IP on `/api/coupons`.

## Administrative order visibility (read-only)

- `GET /api/admin/orders` (manager, or an admin holding `orders:manage`): paginated, filterable order listing (`status`, `paymentStatus`, `userId`, `from`/`to` date range, `orderNumber` regex). Listing responses omit each customer's full shipping address and the idempotency key; invalid filters return 400 `INVALID_QUERY`.
- `GET /api/admin/orders/:id` (manager, or an admin holding `orders:manage`): full order detail including the shipping address, for order operations.
- No route here mutates orders: payment and fulfillment transitions remain future scope by design. Customers keep owner-scoped access through `/api/orders` only, and sellers have no administrative order access.
- Rate limiting: 60 requests per 15 minutes per IP on `/api/admin/orders`.

## Not implemented

There is no payment-provider integration, no verified payment callbacks, no checkout integration that applies a redeemed coupon to stored order totals, no cancellation/refund/fulfillment endpoints, no per-vendor order splitting, no server-side cart persistence, no customer address CRUD, and no reviews endpoint. (A coupon engine and read-only administrative order visibility now exist — see the Coupons and Administrative order visibility sections — but the frontend admin coupon and order tabs do not call these APIs yet.) Email verification and refresh-token rotation are also not implemented. Do not treat those domains as backend-connected or production-ready until their API contracts and tests exist.

## Frontend authentication

The Vite client uses `VITE_API_URL` (default `http://localhost:4000`) for the portal login pages and the registration form. The access token is held in memory and is not written to localStorage; only the user object is persisted locally, and a rehydrated user is not treated as authenticated. A page refresh therefore requires signing in again until a refresh-token/session endpoint is implemented.

Only the portal login pages and the registration form call the auth API. The frontend session restore (`authService.getCurrentUser`) reads the persisted local user object and never calls `GET /api/auth/me`; the admin dashboard additionally re-verifies the account through `GET /api/auth/me` on load so stale or revoked permission data is corrected by the server before administrative sections render; `logout` is a local-only operation that clears browser state without invalidating the token server-side (the one-hour token expires on its own); `updateProfile` updates only the local user object; and the address book is browser-local (`localStorage` with mock fallback) because no profile or address endpoints exist yet.

The login UI provides independent portals — `/login` (customer), `/vendor/login`, `/admin/login`, and `/manager/login` — each with its own branding, copy, and post-login destination (`/account`, `/seller/dashboard`, `/admin`, and `/manager`). Each page submits only to its own role-specific endpoint; unauthenticated visitors to a protected area are redirected to the portal for that area with their destination preserved, and authenticated users with the wrong role are routed to their own home area. The backend role set is `CUSTOMER`, `VENDOR`, `ADMIN`, and `MANAGER`: the manager is the single primary platform owner (bootstrap-only) and appoints admins with granular permission presets. The production header account menu links to the real portal sign-in pages instead of switching simulated roles. Set `VITE_ENABLE_DEMO_AUTH=true` only for local development to reveal demo-role buttons; these sessions do not carry API credentials and must never be treated as real authentication.

Public registration always creates a `CUSTOMER`. Seller registration submits a vendor application; the manager or an admin holding `vendors:review` must approve it before the account receives the `VENDOR` role. Applications are available under `/api/admin/vendors/applications`.

## Validation and tests

Run the automated tests with:

```powershell
npm test
```

`npm test` discovers every `*.test.ts` under `backend/` and `src/`:

- Backend unit tests: product-input validation, rate-limiter behavior, upload image decoding.
- Frontend unit tests: the browser-local `ordersService` (orders start PENDING/unpaid, no fabricated tracking data); the admin dashboard permission model (`adminPermissions` section resolution, fail-closed sanitization, manager/admin/other-role behavior); and the admin API client module (order query building, strict payload parsing that rejects malformed responses while preserving valid empty results, error propagation, coupon body building and toggle behavior).
- MongoDB integration suites (skipped unless `RUN_MONGODB_INTEGRATION=true`):
  - the security suite on `rudin_store_integration_test` covers authentication, disabled/revoked tokens, role boundaries, concurrent manager bootstrap (exactly one manager can be created), manager-appointed administrators with server-resolved permission presets, vendor approval, product lifecycle, cross-vendor ownership, and PUBLISHED-only public catalog;
  - the orders suite runs on a dedicated derived database (`rudin_store_integration_test_orders`) on its own port, because the Node test runner executes test files in parallel; it covers server-computed pricing, out-of-stock and persistence-failure transaction rollback, variant mismatch, sequential and concurrent idempotent replays, and cross-user order isolation.
  - the login-portals suite runs on a dedicated derived database (`rudin_store_integration_test_portals`) on port 4319; it covers per-portal role matching with generic errors, pending/rejected vendor applicants on the vendor portal, public-registration role-escalation prevention, manager-owned governance (the manager manages the catalog while appointed admins stay inside their granted permissions and cannot self-escalate), disabled-admin and expired-token rejection, password-reset credential rotation, and effective `adminPermissions` exposure on login/`me` responses (full catalog for the manager, granted list for an admin, omitted for other roles).
  - the coupons-orders suite runs on a dedicated derived database (`rudin_store_integration_test_coupons`) on port 4320; it covers the `coupons:manage` and `orders:manage` permission boundaries (including the `operations` preset and cross-permission denial), coupon code immutability and duplicate-code rejection, inactive/expired/below-minimum coupon rejection, ownership-scoped redemption, one-coupon-per-order redemption with idempotent replays and 409 for a second coupon, read-only administrative order listing/detail with address-safe summaries and invalid-filter rejection, and cross-customer order isolation.
  - the coupon-redemption suite runs on a dedicated derived database (`rudin_store_integration_test_redemption`) on port 4321; it covers concurrent duplicate redemption for one order (idempotent replay, single consumption), a `usageLimit` of one under concurrent attempts on different orders (exactly one consumption, no orphaned claims), percentage rounding, FIXED discounts capped at the order subtotal, FREE_SHIPPING recorded as a zero monetary benefit while no shipping cost is modeled, and not-yet-valid rejection without consumption.

Every integration suite asserts that its URI targets only the isolated integration database(s), deletes its collections' documents at setup and teardown, terminates its spawned API child process, and closes its Mongoose connection in a `finally` block. The backend connection guard refuses any other database when `RUN_MONGODB_INTEGRATION=true`. CI uses an ephemeral MongoDB replica set. Never point `RUN_MONGODB_INTEGRATION=true` at a development, manual-test, or production database. Run `npm run lint`, `npm test`, and `npm run build` before merging.

## Manager bootstrap concurrency safety

The manager bootstrap's existence checks ("a manager already exists" and "email already in use") and the account insert run inside a shared transactional singleton guard. This serializes competing bootstrap transactions and guarantees that exactly one manager account can ever be created, even under concurrent requests. This mechanism requires MongoDB transactions, so use MongoDB Atlas or another replica-set/sharded deployment; a standalone MongoDB server does not support these transactions. Integration tests against the configured MongoDB deployment are still required before production use.

