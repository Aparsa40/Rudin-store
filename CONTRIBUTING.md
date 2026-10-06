# Contributing to Rudin Store

Thank you for contributing to Rudin Store.

This project is currently maintained as an API-ready frontend prototype.

---

## Development Requirements

Install:

- Node.js
- npm

Install project dependencies:

```bash
npm install

Development Workflow

Create a branch from the appropriate base branch.

Recommended naming:

feature/<name>
fix/<name>
refactor/<name>
docs/<name>
release/<version>

Example:

release/v2.0.0

Before Committing

Run:

npm run format
npm run format:check
npm run lint
npm run build

All relevant checks should pass before creating a pull request.

Formatting

Prettier is the project formatter.

Format the project:

npm run format

Check formatting without changing files:

npm run format:check

Do not manually introduce formatting styles that conflict with the project configuration.

TypeScript

The project uses TypeScript validation through:

npm run lint

The current lint command performs TypeScript checking with:

tsc --noEmit

Type errors should be fixed before merging.

Architecture Rules

Keep UI components independent from backend implementation details.

Prefer:

Component
    ↓
Service
    ↓
Mock/API implementation

instead of embedding data access directly inside UI components.

Keep state concerns in the appropriate Zustand store.

Mock Data

Mock data is intentionally part of the current architecture.

Do not remove mock data merely because a backend is planned.

However:

clearly distinguish mock behavior from real integrations

do not fabricate successful external transactions

do not present demo authentication as production authentication

do not introduce fake payment/provider APIs

Security

Never commit:

passwords

API keys

tokens

database credentials

production secrets

Review SECURITY.md before contributing security-sensitive changes.

Documentation

Update documentation when architectural or user-visible behavior changes.

Relevant documentation:

README.md
CHANGELOG.md
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

Pull Requests

A pull request should include:

clear title

concise description

reason for the change

relevant validation results

documentation updates when required

Do not include unrelated changes.

Commit Messages

Use clear, action-oriented commit messages.

Examples:

feat: add wishlist service
fix: validate cart stock
refactor: isolate coupon service
docs: update v2 architecture
chore: format project

Pull Request Checklist

Before opening a PR:

Code is formatted.

TypeScript validation passes.

Production build passes.

No secrets are committed.

Relevant documentation is updated.

No unrelated files were modified.

Mock functionality is clearly identified.

Security-sensitive behavior is not enforced only on the client.

```
