# Frontend Architecture — Rudin Multi-Vendor Store

## Architectural Philosophy

Rudin Store v2.1.0 is an API-ready frontend architecture.

    UI
     ↓
    Zustand Store
     ↓
    Domain Service
     ↓
    Mock / Local Persistence
     ↓
    Future API Client

The goal is to replace service implementations rather than rewrite the UI when the backend becomes available.

## Directory Structure

    src/
    ├── components/
    │   ├── auth/
    │   ├── cart/
    │   ├── layout/
    │   ├── product/
    │   ├── search/
    │   └── ui/
    ├── data/
    ├── pages/
    ├── services/
    ├── store/
    └── types/

## Authentication State

The auth store now starts with:

    user = null
    isAuthenticated = false

Demo login is explicit through loginAsDemo(role) and setDemoRole(role).

This removes the previous default fake authenticated session.

Production integration should replace demo login with trusted backend session state.

## Route Protection

ProtectedRoute checks client-side authentication and optional role requirements.

Current protected routes:

    /account/*
    /seller/dashboard
    /admin

This is navigation UX only. Backend APIs must enforce real authorization.

## Cart State

useCartStore owns cart items, save-for-later items, applied coupon, and drawer state.

Before quantity mutations, the store asks cartService for available stock.

This is a client-side consistency check. Production stock must be validated transactionally by the backend.

## Persistence

Zustand persistence and selected localStorage services remain part of the demo architecture.

The v2.1 goal is consistency, not a wholesale persistence rewrite.

Production persistence should move to backend APIs and PostgreSQL.

## Coupon State

Coupon validation considers active status, validity dates, minimum purchase, discount type, and maximum discount.

The backend must repeat these rules authoritatively.

## Multi-Vendor Checkout

Cart items retain vendor identity so the UI can group fulfillment information by seller.

The production backend must calculate authoritative prices, discounts, inventory, shipping, taxes where applicable, and order totals.

## Future Backend Boundary

    React
      ↓
    Zustand
      ↓
    Domain Service
      ↓
    API Client
      ↓ HTTPS
    Backend
      ├── Auth/session
      ├── Products/vendors
      ├── Cart/inventory
      ├── Orders/payments
      ├── Reviews/coupons
      ├── Contact
      └── PostgreSQL

This boundary keeps backend technology replaceable without coupling it to React components.
