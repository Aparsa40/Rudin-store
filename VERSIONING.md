# Versioning Policy

## Overview

Rudin Store follows Semantic Versioning:

```text
MAJOR.MINOR.PATCH

For example:

2.0.0

MAJOR

Increase the MAJOR version when incompatible changes are introduced.

Examples:

Breaking public service contracts

Breaking domain type contracts

Major architectural migration

Removal of supported application behavior

Breaking changes to documented integration contracts

Example:

2.0.0 → 3.0.0

MINOR

Increase the MINOR version when backward-compatible functionality is added.

Examples:

New marketplace functionality

New service domain

New reusable components

New seller/admin capabilities

New documented API-ready interfaces

Example:

2.0.0 → 2.1.0

PATCH

Increase the PATCH version for backward-compatible fixes.

Examples:

Bug fixes

Security fixes

Documentation corrections

Formatting/configuration corrections

Small internal improvements

Example:

2.0.0 → 2.0.1

Current Release

Version: 2.0.0
Release type: MAJOR
Status: Frontend Prototype / API-Ready Architecture

Version 2 represents the transition from the previous 1.x frontend implementation to the expanded domain-service and state-management architecture.

Version Sources

The application version should be kept synchronized across project metadata.

The authoritative application version is:

package.json

The lockfile must be regenerated through npm rather than manually edited:

npm install

Documentation should reference the same release version where a specific version is required.

Git Branch Naming

Recommended branch patterns:

feature/<name>
fix/<name>
refactor/<name>
docs/<name>
release/<version>

The version 2 migration branch is:

release/v2.0.0

Release Checklist

Before releasing a version:

Update package.json.

Regenerate package-lock.json with npm.

Update CHANGELOG.md.

Update relevant documentation.

Run formatting.

Run TypeScript validation.

Run production build.

Review Git status.

Commit the release.

Push the release branch.

Create the release PR.

Tag the release after approval/merge according to repository policy.

Important Rule

Do not manually change the version in package-lock.json.

Use npm to keep package metadata and the lockfile synchronized.

```
