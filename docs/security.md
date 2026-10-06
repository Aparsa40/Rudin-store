# Security Guidelines

## Purpose

This document describes the baseline security practices for the Rudin Store repository and its development workflow.

## Secrets

Secrets must never be committed to the repository.

Examples include:

- API keys
- Access tokens
- Private keys
- Database credentials
- Authentication secrets
- Production service credentials

Environment-specific secrets should be supplied through environment variables or the deployment platform's secret management system.

## Environment Files

Local environment files must remain outside source control.

The repository may provide:

```text
.env.example
```

containing placeholder values and documentation for required variables.

It must not contain real credentials.

## Dependency Security

Dependencies should be installed using the lockfile:

```bash
npm ci
```

Dependency changes must be reviewed before being committed.

The following checks should be performed after dependency updates:

```bash
npm ci
npm run lint
npm run build
npm audit
```

Security fixes should be prioritized when vulnerabilities are discovered in production dependencies.

## Dependency Resolution

Dependency conflicts must be fixed at the dependency-definition or lockfile level.

The following options must not be used as a routine method of bypassing dependency validation:

```bash
npm install --force
npm install --legacy-peer-deps
```

If an exception is necessary, the reason and impact should be documented.

## Git Security

Before committing changes, verify that sensitive files are not staged:

```bash
git status
git diff --cached
```

Particular attention should be paid to:

- `.env`
- credentials
- private keys
- local configuration
- generated secrets
- deployment credentials

## Reporting a Vulnerability

Security vulnerabilities should not be disclosed publicly through GitHub Issues.

Please follow the reporting instructions in the repository's `SECURITY.md`.

Reports should contain enough information to reproduce and assess the issue without unnecessarily exposing sensitive information.

## Security Changes

Security-related changes should:

1. Clearly describe the affected component.
2. Avoid exposing secrets or exploit credentials.
3. Include appropriate validation.
4. Update documentation when required.
5. Be reviewed before release.

## Production Security

Production deployments should use platform-managed secrets and HTTPS/TLS.

Debug configuration, development credentials, and local-only settings must not be exposed in production.

## Security Principle

Security should be treated as part of the normal development lifecycle rather than as a final deployment step.