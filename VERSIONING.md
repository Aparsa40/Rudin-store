# Versioning Policy

Rudin Store follows Semantic Versioning: MAJOR.MINOR.PATCH.

## MAJOR

Use MAJOR for incompatible public or architectural changes.

Example: 2.1.0 → 3.0.0

## MINOR

Use MINOR for backward-compatible functionality and meaningful feature additions.

Example: 2.0.0 → 2.1.0

The v2.1.0 candidate adds frontend hardening without introducing a production backend.

## PATCH

Use PATCH for backward-compatible fixes and maintenance.

Example: 2.1.0 → 2.1.1

## Current Candidate

    Version: 2.1.0
    Branch: release/v2.1.0
    Status: Release candidate / under PR review
    Base: main

## Version Authority

The authoritative application version is package.json.

Keep package-lock.json synchronized through npm. Do not manually edit dependency-resolution metadata.

## Branch Naming

    feature/<name>
    fix/<name>
    refactor/<name>
    test/<name>
    docs/<name>
    release/v<version>

## Release Checklist

1. Update package.json.
2. Regenerate package-lock.json with npm.
3. Update CHANGELOG.md.
4. Update README.md and affected docs.
5. Run npm run format:check.
6. Run npm run lint.
7. Run npm run build.
8. Run automated tests when a test suite exists.
9. Review git diff and git status.
10. Confirm no secrets or generated artifacts are committed.
11. Push the release branch.
12. Review the release PR.
13. Tag only after approval and merge.

Never manually edit dependency-resolution entries in package-lock.json.
