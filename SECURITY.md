# Security Policy

## Project Security Status

Rudin Store is currently a frontend prototype and is **not a production-secured e-commerce platform**.

The current application contains mock/frontend implementations for several security-sensitive capabilities.

Client-side controls must not be considered security boundaries.

---

## Current Security Limitations

The current prototype does not provide production-grade:

- Server-side authentication
- Server-side authorization
- Role-based access control enforced by a trusted backend
- Password storage
- Password hashing
- Session management
- Secure token lifecycle management
- Payment authorization
- Payment webhooks
- Server-side inventory enforcement
- Server-side order integrity
- Server-side coupon enforcement
- Production shipping verification
- Production payout processing

Frontend state, LocalStorage, mock services, and route guards can be modified by the client and therefore cannot protect sensitive operations.

---

## Production Security Requirements

Before production deployment, security-sensitive operations must be moved behind a trusted backend.

At minimum, production implementation should include:

- Secure authentication
- Proper password hashing
- Secure session or token management
- Server-side authorization and RBAC
- Server-side input validation
- Server-side order and inventory validation
- Secure payment-provider integration
- Payment webhook verification
- Server-side coupon validation
- Audit logging for sensitive operations
- Rate limiting where appropriate
- Secure secret management
- HTTPS/TLS
- Appropriate CORS and security headers
- Dependency vulnerability monitoring

---

## Reporting a Vulnerability

Please do not publicly disclose security vulnerabilities before they have been reviewed.

For private vulnerability reports, use the repository's configured private security reporting mechanism when available.

If private reporting has not yet been configured, contact the project maintainer privately before publishing sensitive details.

Please include:

- A clear description of the vulnerability
- Affected version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Potential impact
- Any relevant proof of concept

---

## Scope

Security reports involving the following areas are particularly important:

- Authentication
- Authorization
- Account access
- Payment flows
- Order manipulation
- Inventory manipulation
- Coupon abuse
- Sensitive data exposure
- Dependency vulnerabilities
- Cross-site scripting
- Injection vulnerabilities

Thank you for helping improve the security of Rudin Store.