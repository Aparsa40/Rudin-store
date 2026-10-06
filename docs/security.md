# Security Architecture

**Version:** 2.0.0

## Security Boundary

Rudin Store is currently a frontend application.

The browser is an untrusted environment.

Therefore:

```text
Frontend validation ≠ Security enforcement
Frontend route guard ≠ Authorization
Mock authentication ≠ Production authentication
```

Any security-sensitive decision must ultimately be enforced by a trusted backend.

---

## Authentication

The current application contains mock/demo authentication behavior.

The frontend may maintain:

- current user state
- authentication UI state
- demo session state

but these values must not be treated as authoritative identity proof.

A production backend must validate credentials and establish trusted sessions.

---

## Authorization

The frontend may protect routes for UX purposes.

Protected areas include concepts such as:

```text
/account
/seller
/admin
```

The backend must independently verify:

```text
authenticated user
+
required role
+
resource ownership
```

for every sensitive operation.

---

## Data Validation

Client-side validation should be considered convenience validation.

The backend must independently validate:

- product IDs
- quantities
- prices
- discounts
- coupon rules
- order ownership
- seller ownership
- user roles
- payment state

Never trust values received from the browser.

---

## Payments

Payment functionality in 2.0.0 is simulated.

No production payment processor is implemented.

The frontend must not create authoritative payment state.

A production payment architecture should use a trusted backend and payment provider.

---

## Shipping

Shipping is currently simulated.

External carrier operations must be performed and confirmed by backend integrations.

---

## Secrets

Do not put secrets in:

```text
src/
public/
README.md
mockData.ts
```

Do not commit `.env` files containing secrets.

Use:

```text
.env.example
```

for safe configuration examples.

---

## Local Storage

The frontend uses browser persistence for selected demo/application state.

Local storage must not be treated as a secure secret store.

Do not store sensitive credentials or production authorization secrets in local storage.

---

## Dependency Security

Use the lockfile for reproducible installations:

```bash
npm ci
```

Review dependency vulnerabilities regularly:

```bash
npm audit
```

---

## Production Requirements

Before treating the application as production software, implement:

1. Server-side authentication.
2. Server-side authorization.
3. Secure session management.
4. Backend input validation.
5. Database access controls.
6. Payment provider integration.
7. Secure order processing.
8. Secure seller authorization.
9. Secure administrative authorization.
10. Secret management.
11. Security monitoring and logging.

---

## Current Security Status

```text
Frontend hardening:          Improved
Client-side validation:      Present
Route-level UX protection:   Present where implemented
Backend authorization:       Not implemented
Production authentication:   Not implemented
Production payments:         Not implemented
Production database:         Not implemented
```
