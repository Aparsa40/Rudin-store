# Security Policy

## Scope

This policy describes the v2.1.0 security posture and the requirements for moving Rudin Store from a frontend prototype to a production marketplace.

## Current Security Model

Rudin Store v2.1.0 is a hardened frontend prototype. It includes client-side route guards, client-side validation, demo authentication, and browser persistence.

These features improve UX and demo consistency but are not trusted security boundaries.

| Capability | v2.1.0 | Production |
|---|---|---|
| Login | Mock/demo | Backend credential verification |
| Authorization | Client guard | Server-side authorization |
| Sessions | Browser state | Secure server-managed session |
| Password reset | Demo/UI | Trusted recovery service |
| Cart stock | Client validation | Server transaction |
| Coupons | Client validation | Server-side rules |
| Payments | Simulation | Provider + backend |
| Database | None | PostgreSQL or equivalent |
| Contact | No production backend | API + controlled notification |

## Authentication

The current login/register flow creates demo users in frontend state.

A production authentication service should:

1. Accept credentials only over HTTPS.
2. Hash passwords with a modern password-hashing algorithm such as Argon2id or bcrypt.
3. Never return password hashes to the browser.
4. Issue secure sessions or short-lived tokens with refresh/revocation.
5. Prefer secure, HttpOnly, SameSite cookies for cookie-based sessions.
6. Rate-limit login and password-reset attempts.
7. Support account recovery and session revocation.
8. Audit security-sensitive events without logging passwords or tokens.

The frontend auth store should eventually represent trusted backend session state.

## Authorization

ProtectedRoute is a UX/navigation guard.

Production authorization must be enforced server-side for account resources, seller/vendor resources, admin operations, orders, products, coupons, reviews, and payouts.

The server must derive authorization from the authenticated session and database state, not from role values supplied by the browser.

## Cart, Inventory, and Checkout

The v2.1 client-side stock/coupon checks are defensive UX.

The backend must re-check product availability, variants, quantities, prices, coupons, shipping, ownership, and payment state. Order creation and inventory reservation should be transactional to prevent overselling.

## Payments

No real payment gateway is implemented. Payment success must never be inferred from a browser-only flag.

## Contact

A production Contact Us endpoint should validate input, rate-limit abuse, persist the inquiry, and optionally notify a controlled support mailbox or ticket system. Provider secrets must remain server-side.

## Database

The browser must never connect directly to PostgreSQL.

Recommended logical domains:

- users
- sessions
- roles/permissions
- vendors
- products and variants
- inventory
- addresses
- carts
- coupons
- orders and order items
- payments
- reviews
- contact inquiries
- audit events

## Secrets

Never commit API keys, private tokens, passwords, database credentials, payment secrets, or production environment files.

Use .env.example for safe configuration examples.

## Local Storage

Browser storage is not a secure secret store. Do not store passwords, production credentials, payment secrets, or authoritative authorization state in localStorage.

## Dependency Security

    npm ci
    npm audit

The v2.1.0 candidate's latest npm ci reported 0 vulnerabilities.

## Reporting a Vulnerability

Do not publicly disclose an unpatched security vulnerability. Use the repository's private security reporting mechanism when available.

Include the affected version/component, reproduction steps, impact, and suggested mitigation. Never include real credentials, private tokens, or personal data.
