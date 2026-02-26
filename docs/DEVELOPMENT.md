# Development Guide

## Requirements

- Node.js 20+
- npm

## Setup

```bash
npm install
```

## Local commands

```bash
npm run precheck        # format check + typecheck
npm run test            # all tests
npm run test:unit
npm run test:integration
npm run test:property
npm run build
```

## CI pipeline

Workflow file: `.github/workflows/ci.yml`

Pipeline behavior:

1. Detect changed paths
2. Run precheck only when related files changed
3. Run unit/integration/property jobs independently (gated by precheck)
4. On `main` push, publish to npm only if:
   - all required checks pass
   - `package.json` changed
   - package version does not already exist on npm

Required GitHub secret for publishing:

- `NPM_TOKEN`

## Release steps

1. Update `version` in `package.json`.
2. Update changelog/release notes as needed.
3. Push to `main`.
4. CI publishes automatically when conditions pass.

## License note

This project is distributed under the **MIT License**.
