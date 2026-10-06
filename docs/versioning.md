# Versioning

**Current version:** 2.0.0

Rudin Store uses Semantic Versioning:

```text
MAJOR.MINOR.PATCH
```

## MAJOR

Breaking architectural, API, service, or domain-contract changes.

Example:

```text
2.0.0 → 3.0.0
```

## MINOR

Backward-compatible feature additions.

Example:

```text
2.0.0 → 2.1.0
```

## PATCH

Backward-compatible fixes and maintenance.

Example:

```text
2.0.0 → 2.0.1
```

---

## Version Authority

The application version is defined in:

```text
package.json
```

The lockfile is regenerated through npm.

Do not manually edit the lockfile version metadata.

Use:

```bash
npm install
```

after changing package metadata.

---

## Release Documentation

Every release should update:

```text
package.json
package-lock.json
CHANGELOG.md
README.md
```

and any technical documentation affected by the release.

---

## Branches

Recommended release branch:

```text
release/v2.0.0
```

Other branches:

```text
feature/<name>
fix/<name>
refactor/<name>
docs/<name>
```

---

## Release Validation

Before a release:

```bash
npm run format:check
npm run lint
npm run build
```

The release should not be considered validated until these checks complete successfully.
