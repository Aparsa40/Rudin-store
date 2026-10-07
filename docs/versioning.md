# Versioning

**Current candidate:** 2.1.0  
**Branch:** release/v2.1.0

Rudin Store uses Semantic Versioning: MAJOR.MINOR.PATCH.

## MAJOR

Breaking architectural, API, service, or domain-contract changes.

Example: 2.1.0 → 3.0.0

## MINOR

Backward-compatible feature additions.

Example: 2.0.0 → 2.1.0

The v2.1.0 candidate adds frontend hardening without a production backend.

## PATCH

Backward-compatible fixes and maintenance.

Example: 2.1.0 → 2.1.1

## Version Authority

The application version is defined in package.json.

Keep package-lock.json synchronized through npm.

## Release Branch

    release/v2.1.0

Recommended branches:

    feature/<name>
    fix/<name>
    refactor/<name>
    test/<name>
    docs/<name>

## Release Validation

    npm ci
    npm run format:check
    npm run lint
    npm run build

Run automated tests when they exist.

Tag only after PR approval and merge.
