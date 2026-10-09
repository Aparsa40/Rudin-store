# Backend API: Authentication, administrators, and products

## Authentication

- `POST /api/auth/register`: creates a customer account. Public registration cannot choose an elevated role.
- `POST /api/auth/login`: validates credentials against MongoDB and returns a one-hour bearer access token.
- `GET /api/auth/me`: returns the currently authenticated account.
- Passwords are hashed with Node.js scrypt and random per-password salts; plaintext passwords are never stored.
- Send protected API requests with `Authorization: Bearer <accessToken>`.
- The token secret must be at least 32 characters. Generate one in PowerShell:
  ```powershell
  [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
  ```
  Put it in the ignored local `.env` as `AUTH_TOKEN_SECRET`. Do not commit or share it.

## First administrator bootstrap

The first admin must be created once using `POST /api/auth/bootstrap-admin`. Before starting the API, put a separate random value of at least 32 characters in local `.env` as `ADMIN_BOOTSTRAP_SECRET`. Send it in the `X-Admin-Bootstrap-Secret` header with a JSON body containing `email`, `password` (12–128 characters), and `firstName` (optional `lastName`). The route only works while no admin account exists. After success, remove `ADMIN_BOOTSTRAP_SECRET` from `.env` and restart the API. Never expose the bootstrap secret in a browser app or commit it.

## Administrator management

All routes under `/api/admin` require an active administrator bearer token.

- `GET /api/admin/admins`: list administrator accounts (never returns password hashes).
- `POST /api/admin/admins`: create another admin account.
- `PATCH /api/admin/admins/:id/status`: activate or disable an admin. The current admin cannot disable itself, and the last active admin cannot be disabled.

## Product catalog and authoring

- `GET /api/products`: published catalog with filters, sorting, and pagination.
- `GET /api/products/:identifier`: published product by ID or slug.
- `POST /api/products`: requires an active ADMIN or VENDOR bearer token. Admins can publish a product; vendor-created products are forced to DRAFT. Public requests cannot create or publish products.

Product update/delete, vendor onboarding/ownership records, image upload/storage, rate limiting, refresh-token rotation, email verification, password reset, and frontend integration are not included yet. The current Login/Register, AdminDashboard, and SellerDashboard React screens still use mock/local state, so these API routes are not yet wired into the UI. Do not treat the feature as production-ready until the UI is connected and end-to-end security tests pass.
