# Security Architecture

**Version:** 2.1.0

## Security Boundary

    Frontend validation ≠ security enforcement
    ProtectedRoute ≠ backend authorization
    Demo authentication ≠ production authentication
    localStorage ≠ secure credential storage

The browser is untrusted. Sensitive decisions must ultimately be enforced by a trusted backend.

## Authentication

v2.1.0 starts unauthenticated and provides explicit demo authentication/role workflows.

Production authentication must provide credential verification, session creation, refresh/revocation, logout, password reset, and account recovery.

Prefer secure, HttpOnly, SameSite cookies for cookie-based sessions when practical.

## Authorization

ProtectedRoute protects navigation for:

    /account/*
    /seller/dashboard
    /admin

The backend must independently enforce authentication, permissions, roles, and resource ownership.

## Client Validation

v2.1 validates stock and coupon rules in the browser to prevent obvious invalid actions.

The backend must independently validate product/variant availability, quantity, price, coupon rules, order ownership, seller ownership, and payment state.

## Payments

Payment behavior remains simulated. Real provider calls and webhook verification belong on the backend.

## Contact

There is no production contact backend in v2.1. A future Contact Us flow should call a backend endpoint, validate input server-side, rate-limit abuse, persist the inquiry, and use controlled email/ticket delivery.

## Database

The browser must never connect directly to PostgreSQL.

    React
      ↓
    HTTPS API
      ↓
    Backend
      ↓
    PostgreSQL

Recommended domains include users, sessions, vendors, products, variants, inventory, carts, addresses, coupons, orders, payments, reviews, contact inquiries, and audit events.

## Secrets

Never put production secrets in source files, public assets, mock data, localStorage, or documentation.

Use backend environment variables and safe examples in .env.example.

## Dependency Security

    npm ci
    npm audit

The v2.1 candidate's latest npm ci reported 0 vulnerabilities.

## Production Checklist

- [ ] Backend authentication
- [ ] Server-side authorization
- [ ] Secure sessions
- [ ] Password hashing and recovery
- [ ] Rate limiting
- [ ] Input/schema validation
- [ ] PostgreSQL access controls
- [ ] Transactional order/inventory logic
- [ ] Real payment provider
- [ ] Secret management
- [ ] Audit logging and monitoring
- [ ] Contact/email abuse controls
