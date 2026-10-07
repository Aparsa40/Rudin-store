# Development Guide

## Environment

Rudin Store v2.1.0 is a React + TypeScript frontend built with Vite.

## Installation

    npm ci

## Development Server

    npm run dev

## Type Checking

    npm run lint

This runs tsc --noEmit. It is a TypeScript check, not ESLint. Strict TypeScript checking is enabled.

## Formatting

    npm run format
    npm run format:check

## Production Build

    npm run build

## Preview

    npm run preview

## Clean Generated Artifacts

    npm run clean

## Git Workflow

Use focused branches:

    main
     ├── feature/*
     ├── fix/*
     ├── refactor/*
     ├── test/*
     ├── docs/*
     └── release/*

Current release candidate:

    release/v2.1.0

Review changes before merging into main.

## Production Integration

Do not connect the browser directly to PostgreSQL or payment providers.

Planned boundary:

    React service
       ↓
    HTTPS API
       ↓
    Backend
       ├── Authentication / sessions
       ├── Orders / inventory
       ├── Payments
       ├── Contact
       └── PostgreSQL

See docs/backend-integration.md.
