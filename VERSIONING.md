# Versioning Policy

Rudin Store follows [Semantic Versioning](https://semver.org/) in the form:

```text
MAJOR.MINOR.PATCH
```

## MAJOR

Increment the major version when introducing breaking changes to the public application architecture, APIs, contracts, or other compatibility-sensitive interfaces.

Example:

```text
1.0.0 → 2.0.0
```

## MINOR

Increment the minor version when adding backward-compatible functionality or substantial new features.

Example:

```text
2.0.0 → 2.1.0
```

## PATCH

Increment the patch version for backward-compatible bug fixes, documentation corrections, dependency fixes, or small maintenance changes.

Example:

```text
2.1.0 → 2.1.1
```

## Historical Snapshots

Historical versions are preserved using Git tags:

```text
v1.0.0
v2.0.0
v2.1.0
```

A tagged version represents a specific repository state and should not be rewritten after publication.

## Release Process

A release should generally follow:

```text
Development branch
      ↓
Implementation
      ↓
Type checking
      ↓
Build
      ↓
Automated tests
      ↓
Manual smoke testing
      ↓
Pull Request review
      ↓
Merge to main
      ↓
Git tag
      ↓
CHANGELOG update
```

## Historical Baseline Rule

Historical snapshots must not be silently modified to make them appear healthier than they originally were.

For example, the `v1.0.0` dependency conflict is documented rather than retroactively modifying the historical dependency manifest.

A subsequent release should contain the actual fix.

## Pre-release Versions

Pre-release versions may use identifiers such as:

```text
2.2.0-alpha.1
2.2.0-beta.1
2.2.0-rc.1
```

Pre-release versions should not be treated as production releases unless explicitly documented otherwise.