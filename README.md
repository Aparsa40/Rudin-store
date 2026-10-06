# Rudin Store Frontend

Rudin Store is a premium multi-vendor e-commerce marketplace frontend built with React and TypeScript.

The project is designed as a **backend-ready frontend prototype**: the UI is organized around domain models, service abstractions, and state management so that mock implementations can eventually be replaced by real backend APIs and persistent infrastructure.

> **Current status:** Prototype / Frontend Development  
> **Current baseline:** `v1.0.0`  
> **Backend:** Not implemented  
> **Payments:** Not implemented; no real payment gateway is connected  
> **Shipping:** Not implemented; no real shipping provider is connected  
> **Authentication:** Frontend/mock implementation only

---

## Technology Stack

- **Framework:** React 19
- **Build Tool:** Vite
- **Language:** TypeScript
- **Routing:** React Router
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **State Management:** Zustand
- **Architecture:** Component-based frontend with service abstractions
- **Data:** Mock/local frontend data in the current prototype

---

## Project Structure

```text
src/
├── components/       # Reusable UI and feature components
├── data/             # Mock/static application data
├── pages/            # Application pages and route-level views
├── services/         # Domain/service abstractions
├── store/            # Zustand application state
└── types/            # TypeScript domain models

docs/                 # Project and architecture documentation
public/               # Static public assets
```

The exact structure evolves between project versions. See the Git history and version tags for the architectural evolution of the application.

---

## Local Development

### Prerequisites

- Node.js with a compatible npm version
- Git

### Installation

The repository contains a `package-lock.json` intended to provide reproducible dependency resolution.

For the original `v1.0.0` baseline, the standard installation command is:

```bash
npm ci
```

### ⚠️ v1.0.0 Dependency Baseline Issue

The original `v1.0.0` dependency manifest currently contains an unresolved compatibility conflict between Vite and esbuild.

The baseline declares:

```text
vite    ^8.3.0
esbuild ^0.25.0
```

The resolved Vite version requires an esbuild version in the following range:

```text
^0.27.0 || ^0.28.0
```

As a result, running:

```bash
npm ci
```

against the unmodified `v1.0.0` baseline currently fails with npm `ERESOLVE`.

This is intentionally documented rather than silently fixed because `v1.0.0` is being preserved as a historical baseline.

**Do not use `--force` or `--legacy-peer-deps` as a substitute for resolving the dependency compatibility issue in a future maintenance release.**

The dependency issue will be addressed in a separate version/commit rather than modifying the historical `v1.0.0` snapshot.

---

## Running the Development Server

After dependencies have been successfully installed:

```bash
npm run dev
```

The development server will start using the Vite development environment.

---

## Available Scripts

The original `v1.0.0` package defines the following scripts:

```text
npm run dev       Start the Vite development server
npm run build     Build the production bundle
npm run preview   Preview the production build
npm run clean     Remove generated build artifacts
npm run lint      Run TypeScript type checking
```

> Note: In `v1.0.0`, the `lint` script runs `tsc --noEmit`. It is therefore a TypeScript type-check rather than a conventional ESLint run.

---

## Testing Status

The original `v1.0.0` snapshot does **not** contain an automated test suite or test runner.

There are currently no:

- `test` npm scripts
- `tests/` directory
- `__tests__/` directory
- `*.test.*` files
- `*.spec.*` files

Automated testing infrastructure is planned as a subsequent development step.

Until then, validation consists primarily of TypeScript checking, production builds, and manual smoke testing.

See [`docs/testing.md`](docs/testing.md) for the testing strategy.

---

## Architecture

Rudin Store uses a service-oriented frontend structure.

UI components and pages are intended to communicate with domain services instead of coupling themselves directly to raw mock data wherever the architecture supports it.

The intended evolution is:

```text
Current Prototype

React UI
   │
   ▼
Frontend Services
   │
   ▼
Mock / Local Data


Future Production Architecture

React UI
   │
   ▼
Frontend Services
   │
   ▼
HTTP/API Layer
   │
   ▼
Backend
   │
   ├── Database
   ├── Authentication
   ├── Payments
   ├── Orders
   └── Shipping
```

The service layer is an architectural abstraction, not a claim that a production backend already exists.

---

## Backend Readiness

The current application is **backend-ready by architectural intent**, but it is not a production backend-integrated application.

The following capabilities remain frontend/mock implementations in the current baseline:

- Authentication
- Authorization
- User persistence
- Product persistence
- Vendor management
- Order processing
- Payment processing
- Shipping integration
- Payouts
- Notifications
- Messaging
- Database persistence

These integrations must be implemented and secured on the server side before the application can be considered production-ready.

See [`docs/backend-integration.md`](docs/backend-integration.md).

---

## Security

This repository is a frontend prototype.

Client-side authentication, role checks, mock data, local storage, and UI restrictions must **not** be treated as security boundaries.

Production authentication, authorization, payment verification, order integrity, inventory validation, and other security-sensitive operations must be enforced by a trusted backend.

See [`SECURITY.md`](SECURITY.md).

---

## Versioning

Rudin Store uses semantic versioning for released project snapshots:

```text
MAJOR.MINOR.PATCH
```

Version history and changes are documented in [`CHANGELOG.md`](CHANGELOG.md).

See [`VERSIONING.md`](VERSIONING.md) for the project's versioning and release policy.

---

## Project Status

Rudin Store is currently under active development.

The repository intentionally preserves historical versions so that architectural and functional changes can be reviewed through Git history and version tags.

Current historical milestones:

```text
v1.0.0
  │
  └── Initial frontend prototype

v2.0.0
  │
  └── Major frontend architecture and feature evolution

v2.1.0
  │
  └── Production hardening and mock-consistency improvements
```

---

## License

This project is licensed under the terms specified in [`LICENSE`](LICENSE).