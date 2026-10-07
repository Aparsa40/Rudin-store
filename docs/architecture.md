# Architecture Overview

## Current Architecture

Rudin Store v2.1.0 is a client-side React application with a service-oriented frontend architecture.

    Pages / Components
            ↓
       Zustand Stores
            ↓
       Domain Services
            ↓
    Mock Data + Browser Persistence

The service boundary is the planned replacement point for a real HTTP backend.

## Routing

ProtectedRoute provides client-side UX protection for:

- /account/*
- /seller/dashboard
- /admin

This is not server authorization.

## State

Focused Zustand stores include:

- authStore
- cartStore
- wishlistStore
- uiStore

Authentication, cart, and wishlist state use browser persistence for the demo architecture.

## Services

Current service domains include:

- auth
- cart
- categories
- coupons
- orders
- products
- reviews
- vendors
- wishlist

## Repository Structure

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

## Persistence Boundary

Current browser persistence is demo/application state only.

Production persistence should move behind:

    Browser
       ↓ HTTPS
    Backend API
       ↓
    PostgreSQL

The browser must never receive database credentials.

## Build Flow

    Source
      ↓
    npm run lint
      ↓
    npm run build
      ↓
    dist/
      ↓
    Deployment

## Principles

- Keep UI independent from backend details.
- Keep state in the appropriate Zustand store.
- Keep domain I/O in services.
- Keep mock behavior explicit.
- Never put secrets in frontend code.
- Treat client validation as UX, not security.
