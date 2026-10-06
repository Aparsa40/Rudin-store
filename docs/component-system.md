# Component System & Design Language — Rudin Store

This document outlines the UI component hierarchy, design tokens, and interaction guidelines for Rudin Store.

## 1. Visual Identity & Design Principles

- **Typographic Discipline**: Clean, high-contrast hierarchy using Slate neutrals with bold headline weights.
- **Micro-Interactions**: Hover zoom lenses on product photos, slide-in drawers, and real-time live search suggestions.
- **Conversion-Oriented Density**: Informative metadata (reviews count, maker badges, dispatch times) without visual clutter.

## 2. Core UI Components (`src/components/ui/`)

### `Button`

- **Variants**: `primary` (Slate 900), `secondary` (Slate 100), `outline`, `ghost`, `danger`.
- **Sizes**: `sm`, `md`, `lg`, `icon`.
- **States**: `isLoading` with animated SVG spinner, disabled opacity.

### `Badge`

- **Variants**: `primary`, `secondary`, `success` (Emerald), `warning` (Amber), `danger` (Rose), `purple`.
- **Uses**: Order statuses, stock level warnings, verified artisan seals, discount percentage tags.

### `RatingStars`

- Supports full, half, and empty star calculations, numerical score formatting, and review count links.

### `Modal`

- Accessible dialog supporting ESC key listener, focus trap, body scroll locking, and customizable max widths.

### `Drawer`

- Off-canvas slide-over panel used for the `CartDrawer` and mobile filter drawers.

### `ToastContainer`

- Global toast alert queue with auto-dismissal timeouts and color-coded icons (Success, Info, Error, Warning).

## 3. Specialized Domain Components

### `ProductCard` (`src/components/product/ProductCard.tsx`)

- Supports both **Grid View** and **List View** rendering modes.
- Hover image transition revealing secondary angle.
- Instant wishlist toggle with toast feedback.
- Quick View modal trigger without leaving catalog view.

### `SearchBar` (`src/components/search/SearchBar.tsx`)

- Live debounced autocomplete.
- LocalStorage-backed recent search history with single-click repeat and clear.
- Trending popular searches chips.
- Direct product preview list with pricing and thumbnail.

### `CartDrawer` (`src/components/cart/CartDrawer.tsx`)

- Auto-opens upon item addition.
- Vendor grouping headers with free shipping progress bar.
- Interactive coupon code verification (`RUDIN15`, `SAVE25`, `FREESHIP`).
