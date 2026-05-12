---
slug: add-puppeteer-e2e
status: complete
---

# Add Puppeteer E2E Testing Setup

## What was done
- Installed `puppeteer@24.43.0` as devDependency in `integration-tests/`
- Created `integration-tests/jest.e2e.config.js` — separate Jest config targeting `e2e/**/*.spec.ts`, 30s timeout
- Created `integration-tests/e2e/storefront.spec.ts` — sample test that launches headless Chromium, navigates to storefront, saves `homepage.png` screenshot
- Created `integration-tests/e2e/screenshots/.gitkeep` — keeps screenshots dir in git
- Added `test:e2e` script to `integration-tests/package.json`
- Added `test:e2e` pipeline to `turbo.json`
- Committed: f776180a

## How to run
```bash
# From repo root
STOREFRONT_URL=http://localhost:8000 bun run --filter @mercurjs/integration-tests test:e2e

# Or with turbo
turbo run test:e2e --filter=@mercurjs/integration-tests
```

Screenshots land in `integration-tests/e2e/screenshots/`.
