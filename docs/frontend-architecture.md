# Frontend Architecture — Rudin Multi-Vendor Store

This document describes the architectural principles, domain modeling, state partitioning, and service abstraction layer implemented in the Rudin Store frontend application.

## 1. Architectural Philosophy

Rudin Store is built as an **API-Ready Frontend Architecture**. Rather than embedding mock data directly into UI components or tying state to a specific backend framework, all business logic and external I/O are mediated by strict domain service abstractions.

```
┌────────────────────────────────────────────────────────┐
│                      UI Layer                          │
│   (Pages, Modals, Drawers, Cards, Filters, Checkout)   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   State Management                     │
│    (Zustand Stores: Cart, Wishlist, Auth, UI Modals)   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Service Abstraction                   │
│   (/services/products, /services/cart, /services/auth) │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
    [Current Implementation]        [Future Implementation]
      Mock Data & Resolvers           HTTP Client (Axios/Fetch)
      LocalStorage Persistence        PostgreSQL / REST / GraphQL
```

## 2. Directory Structure

```
src/
├── components/
│   ├── cart/         # CartDrawer with multi-vendor separation & coupon engine
│   ├── layout/       # Global Layout, Header with Search, Footer
│   ├── product/      # ProductCard (grid/list), QuickViewModal
│   ├── search/       # Live SearchBar with autocomplete & history
│   └── ui/           # Badges, Modal dialogs, Drawers, Rating stars, Toasts
├── data/             # Comprehensive mock datasets (products, vendors, orders)
├── pages/            # 10 complete route views (Home, Shop, Details, Dashboards)
├── services/         # Modular service boundaries (auth, products, cart, etc.)
├── store/            # Lightweight Zustand stores with LocalStorage hydration
└── types/            # Strict TypeScript domain interfaces
```

## 3. State Partitioning Strategy

1. **Cart Store (`useCartStore`)**:
   - Manages shopping items, save-for-later items, and applied promotional coupons.
   - Synchronizes cart drawer opening/closing state on item additions.
   - Computes multi-vendor subtotal, per-vendor delivery thresholds, and promotional deductions.

2. **Wishlist Store (`useWishlistStore`)**:
   - Manages saved product favorites across browser sessions.

3. **Auth Store (`useAuthStore`)**:
   - Handles customer, vendor, and admin session states.
   - Includes a 1-click Demo Role Switcher (`CUSTOMER`, `VENDOR`, `ADMIN`) enabling instant exploration of all three user perspectives.

4. **UI Store (`useUIStore`)**:
   - Coordinates global modal overlays such as Quick View and animated toast notifications.

## 4. Multi-Vendor Cart & Checkout Engine

Unlike traditional single-seller stores, Rudin partitions cart items by `vendorId`.

- Each vendor group displays its own store identity, verified badge, dispatch location, and independent fulfillment fee.
- If a customer's basket exceeds $75 within a vendor group, free shipping is unlocked for that vendor.
- Checkout produces a centralized multi-vendor order while storing the individual vendor lineage for each item in the order line-items table.
