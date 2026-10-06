# Security Policy

## Scope

This policy describes the security posture of Rudin Store and the process for reporting security issues.

## Current Security Model

Rudin Store 2.0.0 is a frontend prototype.

The application contains mock/demo implementations and therefore must not be treated as a production authentication, payment, authorization, or financial system.

In particular, frontend controls cannot provide authoritative security.

---

## Authentication

Authentication in the current frontend is simulated.

A future production implementation must move authentication to a trusted backend.

The backend must be responsible for:

- credential verification
- session/token issuance
- session expiration
- password handling
- password reset
- account recovery
- authentication revocation

Passwords must never be treated as trusted client-side state.

---

## Authorization

Frontend route guards provide navigation and UX protection only.

They do not establish authorization.

Production authorization must be enforced server-side for:

- customer resources
- seller resources
- vendor resources
- administrator resources
- orders
- products
- coupons
- reviews
- payouts

A client must never be trusted to determine whether an operation is authorized.

---

## Payments

Version 2.0.0 does not provide a real payment gateway.

Payment UI and checkout behavior must be considered simulated.

The application must not claim that a real financial transaction has occurred unless a trusted payment provider and backend transaction flow are implemented.

---

## Shipping

Shipping provider behavior is simulated.

The frontend must not claim that a shipment was created with an external carrier unless a real backend integration confirms it.

---

## Payouts and Financial Operations

Seller payout behavior is not a production financial integration.

The application must not expose or fabricate:

- real transaction confirmations
- real bank transfers
- real payout confirmations
- real escrow confirmations

---

## Secrets

Never commit:

- API keys
- private tokens
- passwords
- database credentials
- production secrets
- authentication secrets

Environment files containing secrets must remain outside version control.

Use `.env.example` for non-secret configuration examples.

---

## Client-Side Security

Client-side validation is useful for user experience but is not a security boundary.

Production systems must validate all security-sensitive values on the backend.

This includes:

- prices
- quantities
- discounts
- permissions
- user roles
- order ownership
- payment status
- seller ownership
- coupon validity

---

## Dependency Security

Dependencies should be installed using the committed lockfile.

Recommended validation:

```bash
npm ci
npm audit

Dependency updates should be reviewed before being introduced into a release.

Reporting a Vulnerability

Do not disclose security vulnerabilities publicly before they have been reviewed.

Report suspected security issues privately through the repository's configured security reporting mechanism.

When reporting an issue, include:

affected version

affected file or component

reproduction steps

security impact

suggested mitigation, if known

Do not include real credentials, private tokens, or personal data in reports.

Security Status of 2.0.0

Frontend Security Hardening:   Improved
Frontend Route Guards:         Present where implemented
Backend Authorization:         Not implemented
Production Authentication:     Not implemented
Production Payments:           Not implemented
Production Database:           Not implemented

Rudin Store 2.0.0 must not be represented as a production-secure marketplace backend.

```
