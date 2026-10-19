# Frontend Architecture â Rudin Multi-Vendor Store

## Architectural Philosophy

Rudin Store v2.1.0 is an API-ready frontend architecture.

    UI
     â
    Zustand Store
     â
    Domain Service
     â
    Mock / Local Persistence
     â
    Future API Client

The goal is to replace service implementations rather than rewrite the UI when the backend becomes available.

## Directory Structure

    src/
    ├── components/
    │   ├── auth/
    │   ├── cart/
    │   ├── home/          # homepage section components (Phase 1)
    │   ├── layout/
    │   ├── product/
    │   ├── search/
    │   └── ui/
    ├── config/            # homeContent.ts: configuration-driven homepage content
    ├── data/
    ├── hooks/            # useClickOutside and future shared hooks
    ├── i18n/             # bilingual localization (Phase 1); see docs/localization.md
    ├── pages/
    ├── services/
    ├── store/
    └── types/

## Localization

The storefront is bilingual (English default, Persian RTL). Localization lives in `src/i18n/`: a Zustand-persisted, validated language preference (`rudin-language-storage`), namespaced translation resources in `src/i18n/locales/`, `useTranslation()` for components, and `useDocumentLanguage()` to keep `<html lang>`/`<html dir>` in sync. Prices, numbers, and dates format through `Intl` for the active locale. Product IDs, API field names, URLs, and database values stay language-independent; database content is never auto-translated. See docs/localization.md.

Phase 1 covers the layout chrome, homepage, search, and product cards; deeper pages remain English-only until later phases.

## Homepage composition

`pages/Home.tsx` composes focused, reusable section components in `components/home/` (hero carousel, trust strip, flash deals, category shortcuts, top sellers, mid-page banner, featured catalog tabs, vendor spotlight, newsletter). Each data section owns its loading, empty, and error states and pulls only from real services; the announcement bar, hero slides, and mid-page banner read the documented configuration module `config/homeContent.ts` because no campaign API exists yet.

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
      â
    Zustand
      â
    Domain Service
      â
    API Client
      â HTTPS
    Backend
      âââ Auth/session
      âââ Products/vendors
      âââ Cart/inventory
      âââ Orders/payments
      âââ Reviews/coupons
      âââ Contact
      âââ PostgreSQL

This boundary keeps backend technology replaceable without coupling it to React components.

