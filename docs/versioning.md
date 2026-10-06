# Versioning Policy

## Overview

Rudin Store follows [Semantic Versioning](https://semver.org/) for application and repository releases.

The version format is:

`MAJOR.MINOR.PATCH`

For example:

`1.0.0`

## Version Rules

- **MAJOR** — incompatible or breaking changes.
- **MINOR** — backward-compatible features or functionality.
- **PATCH** — backward-compatible bug fixes, security fixes, and maintenance changes.

## Pre-release Versions

Pre-release versions may use identifiers such as:

- `1.1.0-alpha.1`
- `1.1.0-beta.1`
- `1.1.0-rc.1`

Pre-release versions are not considered stable releases.

## Source of Truth

The application version is maintained in the project's package metadata and release documentation.

The `package-lock.json` file is generated and maintained by npm and must remain synchronized with `package.json`.

## Dependency Updates

Dependency updates must preserve a valid dependency graph and must not be resolved by bypassing npm's peer-dependency validation with `--force` or `--legacy-peer-deps` unless there is a documented and reviewed reason.

After dependency changes, the following checks should pass:

```bash
npm ci
npm run lint
npm run build
```

## Release Process

A release should:

1. Update the application version.
2. Update `CHANGELOG.md`.
3. Verify dependencies with `npm ci`.
4. Run lint/type checking.
5. Run a production build.
6. Review the Git diff.
7. Create a Git tag matching the release version.

Example:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
```

## Current Release

The repository is currently being prepared for its initial GitHub repository release.

The exact release version should be finalized together with the first production-ready repository commit.