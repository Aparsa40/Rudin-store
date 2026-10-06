# Architecture Overview

## Overview

Rudin Store is a web application organized as a client-side frontend with supporting application configuration and integration points.

The repository is structured to keep application source code, configuration, documentation, and operational metadata separated.

## Main Components

### Frontend

The frontend is implemented using:

- React
- TypeScript
- Vite
- Tailwind CSS
- Motion

The frontend is responsible for:

- Rendering the user interface.
- Managing client-side application state.
- Presenting product and store-related functionality.
- Communicating with configured application services and APIs.

### Build System

Vite is used as the application build system.

The production build generates the deployable frontend assets under:

```text
dist/
```

`dist/` is a generated directory and must not be committed to source control.

### Type Safety

TypeScript is used for static type checking.

The repository currently uses:

```bash
npm run lint
```

for TypeScript validation.

The command performs a no-emit TypeScript check and does not generate build artifacts.

### Styling

Tailwind CSS is used for utility-based styling and is integrated with the Vite build pipeline.

## Repository Structure

```text
Rudin-Store/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
├── public/
├── src/
├── .gitignore
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── SECURITY.md
├── VERSIONING.md
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

## Environment Configuration

Environment-specific configuration must not contain committed secrets.

Local environment files such as `.env` are excluded from Git. A sanitized `.env.example` may be committed to document required configuration.

## Dependency Management

npm is used for dependency management.

`package.json` defines dependency requirements while `package-lock.json` records the resolved dependency tree.

Clean installations should use:

```bash
npm ci
```

Dependency changes should be followed by validation of the lockfile, type checking, and production build.

## Build Flow

The expected production flow is:

```text
Source Code
    ↓
TypeScript Validation
    ↓
Vite Build
    ↓
dist/
    ↓
Deployment
```

## Architectural Principles

The project should prioritize:

- Clear separation of concerns.
- Type safety.
- Reproducible dependency installation.
- Minimal runtime configuration.
- No secrets in source control.
- Explicit and reviewable infrastructure changes.
- Production builds that can be reproduced from the repository.
