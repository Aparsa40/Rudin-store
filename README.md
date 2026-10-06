# Rudin Store

## Enterprise Multi-Vendor E-Commerce Frontend

**Version:** 2.0.0  
**Status:** Frontend Prototype / API-Ready Architecture

Rudin Store is a multi-vendor e-commerce marketplace frontend built with React, TypeScript, Vite, Tailwind CSS, and Zustand.

The application is intentionally structured around domain services and state stores so that the current mock/demo implementation can later be replaced by real backend services without requiring a major UI rewrite.

> **Important:** Rudin Store 2.0.0 is a frontend prototype. Authentication, payments, shipping, payouts, and backend persistence are not production services in this release.

---

## Technology Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- React Router
- Lucide React
- Motion
- Prettier

The project uses TypeScript validation through the `lint` script:

```bash
npm run lint

Production builds are generated with:

npm run build

Code formatting is handled by Prettier:

npm run format
npm run format:check

Features

Marketplace

Multi-vendor product catalog

Vendor storefronts

Product search

Category and product filtering

Rating and review presentation

Product detail pages

Wishlist functionality

Quick product view

Cart and Checkout

Vendor-grouped cart

Quantity management

Save-for-later behavior

Coupon simulation

Multi-step checkout

Delivery option simulation

Payment method simulation

Order confirmation UI

User Areas

Customer account area

Seller dashboard

Admin dashboard

Authentication state management

Frontend route protection

Demo/mock workflows

UI System

Reusable UI primitives include:

Button

Badge

Modal

Drawer

RatingStars

ToastContainer

Domain-specific components include:

ProductCard

QuickViewModal

SearchBar

CartDrawer

Architecture

The application follows a layered frontend architecture:

Pages / Components
        |
        v
Zustand Stores
        |
        v
Domain Services
        |
        v
Mock Data / Local Persistence

The service layer is intentionally separated from the UI so that future API implementations can replace mock implementations without coupling backend concerns directly to React components.

Main directories:

src/
├── components/
├── data/
├── pages/
├── services/
├── store/
└── types/

Services

The service layer is organized around domains such as:

auth
cart
categories
coupons
orders
products
reviews
vendors
wishlist

Stores

Application state is divided into focused Zustand stores:

authStore
cartStore
uiStore
wishlistStore

Mock / Demo Architecture

Version 2.0.0 intentionally retains mock data.

Mock functionality is used for:

UI development

local demonstrations

frontend workflows

development without a backend

future API contract validation

Mock functionality must not be interpreted as real:

authentication

authorization

payment processing

shipping provider integration

payout processing

escrow

email delivery

database persistence

Running Locally

Requirements:

Node.js

npm

Install dependencies:

npm install

Run development server:

npm run dev

Run TypeScript validation:

npm run lint

Format the project:

npm run format

Verify formatting:

npm run format:check

Build production assets:

npm run build

Preview the production build:

npm run preview

Validation Status for 2.0.0

The current v2 migration was validated with:

npm install       PASS
npm ci            PASS
npm run format    PASS
npm run lint      PASS
npm run build     PASS

The production build currently reports a chunk-size warning for a JavaScript bundle exceeding the default 500 kB warning threshold. This is a performance warning, not a build failure.

Security Model

Frontend route guards are UX-level protection only.

They do not replace backend authorization.

A production deployment must implement server-side:

authentication

authorization

session management

input validation

payment authorization

order authorization

seller permissions

administrator permissions

See:

SECURITY.md

docs/security.md

Backend Integration

The current frontend is designed to transition toward a real backend through service abstractions.

See:

docs/backend-integration.md
docs/frontend-architecture.md

The backend is not included in version 2.0.0.

Documentation

Project documentation is organized as follows:

README.md
CHANGELOG.md
CONTRIBUTING.md
SECURITY.md
VERSIONING.md

docs/
├── README.md
├── architecture.md
├── backend-integration.md
├── component-system.md
├── development.md
├── frontend-architecture.md
├── security.md
├── testing.md
└── versioning.md

License

See LICENSE.

Project Status

Frontend:                 Implemented
Mock/Demo Architecture:   Implemented
Backend API:              Not implemented
Database:                 Not implemented
Production Auth:          Not implemented
Payment Gateway:          Not implemented
Shipping Provider:        Not implemented
Payout Provider:          Not implemented
Escrow:                   Not implemented

Rudin Store 2.0.0 should therefore be treated as an API-ready frontend prototype rather than a complete production marketplace backend.

```
