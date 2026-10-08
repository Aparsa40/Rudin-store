# Contributing to Rudin Store

Rudin Store v2.1.0 is maintained as a hardened, API-ready frontend prototype.

## Development

Install dependencies:

    npm ci

Run the development server:

    npm run dev

Recommended branch names:

    feature/<name>
    fix/<name>
    refactor/<name>
    test/<name>
    docs/<name>
    release/v<version>

## Before Committing

    npm run format:check
    npm run lint
    npm run build

Run npm run format first when formatting changes are required.

## TypeScript

npm run lint executes tsc --noEmit. Strict TypeScript checking is enabled.

## Architecture Rules

Prefer:

    React Component
          ↓
    Zustand Store
          ↓
    Domain Service
          ↓
    Mock implementation / future API client

Do not put database access, payment-provider calls, or secret-bearing logic directly in React components.

## Mock / Demo Data

Mock data remains part of the current architecture.

Do:

- keep demo behavior clearly identifiable
- use existing persistence mechanisms
- document simulated behavior
- preserve stable domain contracts

Do not:

- claim mock authentication is real authentication
- fabricate payment or shipping confirmations
- add fake provider APIs as production substitutes
- put secrets into mock data

## Security

Never commit passwords, API keys, tokens, database credentials, payment secrets, or production environment files.

Review SECURITY.md before security-sensitive changes.

## Documentation

Update documentation whenever architecture, security boundaries, commands, versioning, or user-visible behavior changes.

Core documents:

    README.md
    CHANGELOG.md
    VERSIONING.md
    SECURITY.md
    CONTRIBUTING.md

Technical documents:

    docs/README.md
    docs/architecture.md
    docs/backend-integration.md
    docs/component-system.md
    docs/development.md
    docs/frontend-architecture.md
    docs/security.md
    docs/testing.md
    docs/versioning.md

## Pull Requests

A PR should include a clear title, concise description, reason for the change, validation results, security implications when relevant, and documentation updates when required.

Avoid unrelated changes.

## Commit Messages

Use clear action-oriented messages:

    feat: add wishlist service
    fix: validate cart stock
    refactor: isolate coupon service
    docs: update v2.1 documentation
    chore: enable strict TypeScript checks

## Pull Request Checklist

- [ ] Formatting check passes.
- [ ] TypeScript validation passes.
- [ ] Production build passes.
- [ ] Relevant automated tests pass, if present.
- [ ] No secrets are committed.
- [ ] Documentation is updated.
- [ ] No unrelated files are modified.
- [ ] Mock functionality is clearly identified.
- [ ] Security-sensitive behavior is not enforced only on the client.
