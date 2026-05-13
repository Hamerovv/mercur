---
slug: add-puppeteer-e2e
date: 2026-05-11
status: in-progress
---

# Add Puppeteer for E2E Testing and Screenshots

## Goal
Install Puppeteer in the integration-tests package and set up an e2e/ subfolder with Jest config and a sample screenshot test.

## Tasks

### Task 1: Install puppeteer in integration-tests
- Add `puppeteer` to devDependencies in integration-tests/package.json
- Add `@types/puppeteer` if needed (puppeteer ships its own types)

### Task 2: Add e2e test script to integration-tests/package.json
- Add `"test:e2e": "NODE_OPTIONS=--experimental-vm-modules jest --config jest.e2e.config.js --runInBand --forceExit"` script

### Task 3: Create jest.e2e.config.js
- Separate Jest config for e2e tests that targets e2e/ folder
- Uses same SWC transform as existing jest.config.js

### Task 4: Create integration-tests/e2e/ folder with sample test
- `e2e/screenshots.test.ts` — launches browser, navigates to storefront, takes screenshot

### Task 5: Add turbo pipeline entry for test:e2e
- Add to turbo.json so `turbo run test:e2e` works

## Commit
Single atomic commit: "feat: add puppeteer e2e testing setup to integration-tests"
