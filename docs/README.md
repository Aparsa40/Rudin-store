# Rudin Store Documentation

**Documentation version:** 2.0.0

This directory contains technical and operational documentation for Rudin Store.

## Documentation Map

### Architecture

- `architecture.md`
- `frontend-architecture.md`
- `component-system.md`

These documents describe application layers, state management, service boundaries, and UI architecture.

### Development

- `development.md`

Development environment, commands, formatting, validation, and contribution workflow.

### Backend

- `backend-integration.md`

Describes the contract between the current frontend service layer and a future backend implementation.

### Testing

- `testing.md`

Describes the current validation strategy and the limitations of the prototype test setup.

### Security

- `security.md`

Documents frontend security boundaries, mock authentication, authorization limitations, secrets handling, and future backend requirements.

### Versioning

- `versioning.md`

Describes release numbering, branch conventions, and version synchronization.

---

## Version 2.0.0 Status

Rudin Store 2.0.0 is an API-ready frontend prototype.

The following remain outside the current frontend implementation:

- production backend
- production authentication
- server-side authorization
- database
- payment gateway
- shipping provider integration
- payout provider
- escrow
- production email delivery

---

## Validation

Current validation commands:

```bash
npm run format:check
npm run lint
npm run build
```

The current v2 migration passed TypeScript validation and production build validation.

---

## Documentation Rule

Documentation must describe the implementation that actually exists.

Do not document simulated functionality as a real external integration.

When functionality changes, update the relevant technical document and the root `CHANGELOG.md`.
