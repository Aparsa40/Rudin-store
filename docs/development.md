# Development Guide

## Environment

Rudin Store is a React + TypeScript frontend application built with Vite.

Use a compatible Node.js and npm environment for the current project version.

## Installation

For the historical `v1.0.0` baseline:

```bash
npm ci
```

The original baseline currently fails dependency resolution because of a Vite/esbuild compatibility conflict.

This is documented in the root `README.md` and `CHANGELOG.md`.

Do not modify the historical dependency manifest solely to make `v1.0.0` install successfully.

## Development

```bash
npm run dev
```

## Type Checking

The original `v1.0.0` project exposes:

```bash
npm run lint
```

This command currently performs TypeScript checking using:

```text
tsc --noEmit
```

It is not an ESLint invocation.

## Production Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```

## Clean Build Artifacts

```bash
npm run clean
```

## Git Workflow

Development should occur on focused branches.

Recommended flow:

```text
main
  │
  ├── feature/*
  ├── fix/*
  ├── test/*
  └── docs/*
```

Changes should be reviewed before merging into `main`.

## Historical Versions

Historical snapshots are preserved using Git tags.

Do not rewrite published version tags.
