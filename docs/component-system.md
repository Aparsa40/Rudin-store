# Component System & Design Language — Rudin Store

## Visual Identity

- Clean Slate-based neutral palette.
- Strong typographic hierarchy.
- Compact marketplace metadata.
- Product imagery with hover/quick-view interactions.
- Drawer and modal interactions for high-frequency actions.
- Responsive desktop/mobile navigation.

## Core UI Components

Located under src/components/ui/:

### Button

Reusable variants, sizes, loading state, and disabled state.

### Badge

Used for order states, stock indicators, verified sellers, and promotional labels.

### RatingStars

Full/half/empty star presentation and review counts.

### Modal

Reusable dialog surface for focused workflows.

### Drawer

Off-canvas surface used by cart and responsive interactions.

### ToastContainer

Global feedback queue.

## Domain Components

### ProductCard

Grid/list presentation, wishlist interaction, hover imagery, and quick view.

### SearchBar

Product search/autocomplete behavior and recent-search persistence.

### CartDrawer

Cart management, vendor grouping, stock-aware quantity operations, save-for-later, and coupon interaction.

## Authentication UI

The header and login flows use the v2.1 auth-store contract.

Demo perspectives:

- CUSTOMER
- VENDOR
- ADMIN

ProtectedRoute controls navigation UX for protected sections.

These are demo/frontend controls, not backend authorization.

## Implementation Rules

- Prefer reusable primitives over duplicated markup.
- Keep visual components independent from backend implementations.
- Keep data access in stores and services.
- Do not expose secrets through component props or client-side configuration.
- Preserve responsive behavior.
- Avoid contradictory Tailwind utilities such as flex + block on the same element.

## Future Production

Backend integration should not require replacing the component system. Services should move from mock/local implementations to API-backed implementations while components continue consuming stable domain contracts.
