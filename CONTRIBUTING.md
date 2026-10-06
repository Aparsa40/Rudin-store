# Contributing to Rudin Store

Thank you for your interest in contributing to Rudin Store.

## Development Principles

Contributions should prioritize:

- Correctness
- Clear separation of concerns
- Maintainable TypeScript
- Consistent domain/service boundaries
- Honest handling of mock functionality
- Minimal unnecessary architectural changes
- Testable business logic

## Before Making Changes

Please review:

- `README.md`
- `docs/architecture.md`
- `docs/development.md`
- `SECURITY.md`
- `VERSIONING.md`

## Branching

Use focused branches for changes:

```text
feature/<name>
fix/<name>
refactor/<name>
docs/<name>
test/<name>
```

Examples:

```text
feature/product-search
fix/cart-stock-validation
test/order-service
docs/backend-integration
```

## Validation

Before opening a pull request, run the validation commands available for the current project version.

At minimum:

```bash
npm run lint
npm run build
```

When automated tests are available:

```bash
npm test
```

## Pull Requests

A pull request should:

- Have a focused purpose.
- Explain what changed.
- Explain why it changed.
- Include relevant testing information.
- Avoid unrelated refactoring.
- Clearly identify known limitations.

## Mock and Prototype Behavior

Do not present mock behavior as a real external integration.

For example, a simulated payment, shipment, or authentication flow should be explicitly identified as simulated.

## Security

Do not commit:

- API keys
- Passwords
- Access tokens
- Private credentials
- `.env` files containing secrets

See `SECURITY.md` for security guidance.