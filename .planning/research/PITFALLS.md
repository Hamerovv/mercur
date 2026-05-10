# Pitfalls Research — Mercur.js Marketplace

**Project:** bookshook  
**Researched:** 2026-05-10  
**Basis:** Direct codebase inspection of Dockerfiles, docker-compose.yml, medusa-config.ts, with-mercur.ts, commission service, vendor client, vite.config.ts, package.json files across all workspace packages.

---

## Docker / Deployment Pitfalls

### CRIT-D1: Turbo native binary fails on Alpine

**What goes wrong:** `turbo` ships platform-specific prebuilt binaries. When extracted in an Alpine container (musl libc), the binary is missing or crashes with `Exec format error` or extraction errors. Build silently continues without turbo, leaving workspace build ordering undefined.

**Evidence in repo:** Both `Dockerfile` and `Dockerfile.vendor` already apply the workaround — `jq 'del(.devDependencies.turbo) | del(.packageManager)' package.json`. This is a live patch, not a precaution. If it is ever removed (e.g. after a turbo upgrade promising Alpine support), the error will reappear.

**Warning signs:**
- `bun install` exits 0 but a later `turbo run build` in CI hangs or produces `command not found: turbo`
- Docker logs show `.turbo/` not populated

**Prevention:**
- Keep the `jq` strip in every Dockerfile that uses Alpine + bun.
- Build packages manually in dependency order: `types → cli → core → dashboard-sdk → dashboard-shared → client → vendor`. Order is already codified in the Dockerfiles; keep it.
- Pin `oven/bun:1-alpine` to a digest (not just `1`) to prevent surprise upgrades that break the workaround.

**Phase:** INFRA-01 — verify Docker build clean before any feature work.

---

### CRIT-D2: NEXT_PUBLIC_* vars baked at build time, not runtime

**What goes wrong:** Next.js inlines `NEXT_PUBLIC_*` at `next build`. If the storefront image is built without the correct backend URL arg, all browser-side API calls go to `http://localhost:9000` regardless of what `environment:` sets in docker-compose.

**Evidence in repo:** `Dockerfile.storefront` lines 11-13 define `ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL` and bake it via `ENV`. `docker-compose.yml` line 65 passes it as a `build.args` value (`http://localhost:9000`). The container `environment:` block (line 70-71) sets `MEDUSA_BACKEND_URL` (no `NEXT_PUBLIC_` prefix) — that is correct for server-side fetch but irrelevant for client-side calls.

**Warning signs:**
- Browser network tab shows requests to `localhost:9000` instead of the real domain after deployment
- Works in local dev, breaks in staging/prod where backend is on a different host

**Prevention:**
- For local Docker Compose: `NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000` (already correct — browser reaches host via exposed port).
- For any cloud deploy: set the arg to the public API URL at build time, e.g. `--build-arg NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.bookshook.com`.
- Never put the internal Docker service name (`http://medusa:9000`) in `NEXT_PUBLIC_*` — the browser cannot reach Docker-internal hostnames.
- The current `MEDUSA_BACKEND_URL=http://medusa:9000` in `environment:` is the correct server-side override for Next.js Route Handlers; keep it.

**Phase:** INFRA-01 for local, revisit at any staging/prod deploy phase.

---

### MOD-D3: npm in production after bun install in build stage

**What goes wrong:** `Dockerfile` runs `bun install` in the build stage, then switches to `npm install --omit=dev --legacy-peer-deps` inside `.medusa/server`. If `medusa build` generates a `package.json` that references workspace packages via `workspace:*` protocol, npm will fail because npm does not understand bun workspace protocol.

**Evidence in repo:** `Dockerfile` line 47 — `npm install --omit=dev --legacy-peer-deps` runs inside `.medusa/server`. The `medusa build` command (via `bunx`) resolves workspace deps by bundling them; the output `package.json` should not have `workspace:*` remaining. But if a `@mercurjs/core: "*"` wildcard is left unrewritten (as in `apps/api/package.json` line 31), npm may try to resolve it from npm registry.

**Warning signs:**
- `npm install` step logs `404 Not Found @mercurjs/core@*`
- Container fails to start with `Cannot find module '@mercurjs/core'`

**Prevention:**
- After `bunx medusa build`, inspect `.medusa/server/package.json` to confirm all workspace refs have been bundled/removed.
- If any remain, add a `jq` strip step before `npm install` (same pattern as turbo strip).
- Alternatively switch the production install to `bun install --production` inside `.medusa/server` — but bun must be present in the final stage.

**Phase:** INFRA-01.

---

### MOD-D4: Service startup ordering — medusa not ready when vendor/storefront start

**What goes wrong:** `vendor` and `storefront` services use `depends_on: - medusa` with no healthcheck condition. Docker starts them immediately when the medusa container starts, not when Medusa's HTTP server is accepting connections. Vendor panel's build-time SDK codegen (`mercurjs codegen`) may fail if it calls the API during build.

**Evidence in repo:** `docker-compose.yml` lines 56-57 (`depends_on: - medusa`) — no `condition: service_healthy`. `db` and `redis` both have healthcheck conditions; medusa does not.

**Warning signs:**
- Vendor panel shows API errors in browser on first load after `docker compose up`
- Race condition: sometimes works, sometimes fails (non-deterministic)

**Prevention:**
- Add a healthcheck to the `medusa` service:
  ```yaml
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:9000/health || exit 1"]
    interval: 10s
    timeout: 5s
    retries: 10
    start_period: 30s
  ```
- Change vendor/storefront `depends_on` to `condition: service_healthy`.
- The `medusa` startup command already runs migrations before starting (`db:migrate && medusa start`); the healthcheck will naturally wait for that.

**Phase:** INFRA-01.

---

### MOD-D5: Build cache invalidated by source changes before lockfile layer

**What goes wrong:** If a `COPY` of source files precedes `COPY bun.lock`, Docker invalidates the install cache on every source change, making each build reinstall all dependencies (~2-3 min overhead).

**Evidence in repo:** `Dockerfile` lines 8-19 copy only `package.json` files before `bun install` (line 25), then source files (lines 28-29). This is correct. `Dockerfile.vendor` mirrors the same pattern. Risk: any future edit that inserts a `COPY . .` before `bun install` breaks layering.

**Warning signs:**
- CI/CD build times spike from ~2 min to ~8 min after a small code change
- `bun install` appears in every rebuild log even with no dependency changes

**Prevention:**
- Keep the split-copy pattern. Add a comment in each Dockerfile: `# Layer boundary: copy manifests only, run install, THEN copy source`.
- Do not use `COPY . .` as a shortcut.

**Phase:** INFRA-01, enforce in code review.

---

## MedusaJS 2.x Pitfalls

### CRIT-M1: CORS misconfiguration — four distinct CORS surfaces

**What goes wrong:** MedusaJS 2.x has four CORS origin lists: `storeCors`, `adminCors`, `vendorCors` (Mercur extension), `authCors`. A missing origin in any one causes silent 401/403s that look like auth failures. Common mistake: adding storefront origin to `storeCors` but not `authCors`, so login works but token refresh fails.

**Evidence in repo:** `medusa-config.ts` maps all four from env vars. `vendor-cors-middleware.ts` reads `configModule.projectConfig.http.vendorCors` with a `@ts-expect-error` because `vendorCors` is not in Medusa's type but is injected by `withMercur`. If `withMercur` is skipped or `vendorCors` env var is missing, vendor API calls receive `Origin not allowed`.

**Warning signs:**
- Browser console: `CORS error` or `blocked by CORS policy`
- Vendor panel: 401 errors on all authenticated calls even with a valid token
- `withMercur` strips `vendorCors` from the standard Medusa type — TypeScript will not catch a missing value at compile time

**Prevention:**
- Set all four in `.env` as a matched set. Never set one without the others.
- For local: `STORE_CORS=http://localhost:8000`, `ADMIN_CORS=http://localhost:9000`, `VENDOR_CORS=http://localhost:7001`, `AUTH_CORS=http://localhost:9000,http://localhost:7001,http://localhost:8000`.
- `AUTH_CORS` must be a superset of all origins that perform login — include all three apps.
- Do not use trailing slashes in origin values.

**Phase:** INFRA-01 for config, VENDOR-01 for auth flow testing.

---

### CRIT-M2: Admin dashboard `disable` conflict — two separate `disable` flags

**What goes wrong:** `withMercur` has `admin.disable` (top-level MedusaJS admin) and the `admin-ui` module entry also has `options.disable`. These control different things. Setting `admin: { disable: false }` while `admin-ui module options.disable: true` disables only the Mercur overlay but still serves the stock admin dashboard at `/dashboard`. Setting both `false` serves overlapping UIs. Setting both `true` returns 404 for `/dashboard`.

**Evidence in repo:** `medusa-config.ts` lines 8-9: `admin: { disable: false }`. Lines 32-37: admin-ui module with `disable: true`. This combination serves the raw MedusaJS admin at `/dashboard` without Mercur extensions — the admin module overlay is off. For superadmin panel with Mercur widgets (ADMIN-01 through ADMIN-04), both must be `false`.

**Warning signs:**
- `/dashboard` loads but shows no Mercur vendor management sections
- Console error referencing missing Mercur admin components

**Prevention:**
- To get full Mercur-extended admin: set `admin: { disable: false }` AND `admin-ui module options.disable: false`.
- `appDir` in the admin-ui module options must point to the built admin UI output directory. An empty string `''` (as in current config) is a stub; set it to the actual path after building `packages/admin`.

**Phase:** ADMIN-01.

---

### MOD-M3: Migration ordering — Mercur modules run after Medusa core migrations

**What goes wrong:** `medusa db:migrate` runs Medusa core migrations first, then plugin/module migrations. Mercur's link tables (e.g. `order-seller-link`, `product-seller-link`) reference Medusa core tables. If migrations run in wrong order or a Mercur migration references a table not yet created, FK constraint errors appear.

**Evidence in repo:** 7 seller module migrations with timestamps from 2026-03-24 through 2026-04-22. Commission module has one migration (2026-01-30). MikroORM orders by timestamp — if timestamps across Medusa core and Mercur overlap, ordering is deterministic but any manually edited timestamp could break it.

**Warning signs:**
- Startup log: `relation "seller" does not exist` or similar FK error
- Container exits immediately after `db:migrate` with non-zero code
- Only manifests on a fresh database, not on existing ones

**Prevention:**
- Never manually edit migration timestamps.
- On fresh deploys, verify migration runs with `medusa db:migrate --verbose` locally before pushing Docker image.
- Keep `db:migrate` in the container startup command (already done in `docker-compose.yml` line 49) so migrations re-run safely on restart (MikroORM skips already-applied migrations).

**Phase:** INFRA-02.

---

### MOD-M4: Database connection pool exhaustion under concurrent load

**What goes wrong:** MedusaJS 2.x default connection pool is 10. Each worker process opens its own pool. In Docker Compose with a single medusa container this is usually fine, but Mercur's workflows (commission calculation, order splitting, payout) can hold connections across multiple async steps. Under concurrent checkout, pool can saturate.

**Evidence in repo:** No explicit pool configuration in `medusa-config.ts`. `DATABASE_URL` has `?sslmode=disable` but no pool params.

**Warning signs:**
- Log: `remaining connection slots are reserved for non-replication superuser connections`
- Slow API responses under moderate load (>10 concurrent requests)

**Prevention:**
- Add pool config to `medusa-config.ts`:
  ```typescript
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: {
      pool: { min: 2, max: 20 }
    }
  }
  ```
- PostgreSQL 15 defaults to 100 max connections; 20 from app + headroom for admin is safe.

**Phase:** INFRA-01 config, stress-test at STORE-02 (checkout).

---

## Mercur-Specific Pitfalls

### CRIT-V1: Vendor auth token — `credentials: 'include'` requires matching SameSite/Secure cookie config

**What goes wrong:** `apps/vendor/src/lib/client.ts` sets `credentials: 'include'`. This requires the server to respond with `Set-Cookie: SameSite=None; Secure` for cross-origin requests, or `SameSite=Lax` for same-site. In local Docker, the vendor panel on port 7001 and Medusa on port 9000 are cross-origin. If `cookieOptions.secure: false, sameSite: "lax"` (as in current config), the browser will NOT send the cookie on cross-origin requests with `credentials: include` — auth silently fails.

**Evidence in repo:** `medusa-config.ts` lines 14-17: `cookieOptions: { secure: false, sameSite: "lax" }`. `client.ts`: `credentials: 'include'`. For localhost this may work if ports are considered same-site by the browser — but it is browser-dependent and breaks immediately on any real domain deployment.

**Warning signs:**
- Vendor panel: user logs in, gets 200, but subsequent requests return 401 (cookie not sent)
- DevTools → Application → Cookies: no cookie stored for the API origin
- Inconsistent behavior across Chrome vs Safari

**Prevention:**
- Local dev: use a reverse proxy (nginx or Caddy) to serve all apps under the same domain with different path prefixes. This avoids cross-origin entirely.
- For Docker Compose local: document that all three apps must be accessed via the same hostname (not mixing `localhost` and `127.0.0.1`).
- For staging/prod: set `secure: true, sameSite: "none"` and ensure HTTPS on both origins.

**Phase:** VENDOR-01.

---

### CRIT-V2: Commission calculated at order creation — items missing `product.seller` cause zero commission

**What goes wrong:** `commission/service.ts` `getCommissionLines` matches commission rules against `item.product.seller?.id`. If the product→seller link is not hydrated when the commission step runs, `product.seller` is `undefined` and no seller-scoped commission rule matches. A fallback (no-rules default rate) may apply, but seller-specific rates are silently skipped.

**Evidence in repo:** `commission/service.ts` line 91: `return product.seller?.id === rule.reference_id`. The `?` optional chaining means a missing seller silently produces no match. Link `product-seller-link.ts` must be established at product creation time.

**Warning signs:**
- Commission lines created but amounts are all the global-default rate, never seller-specific rates
- Admin sees $0 commission on orders with seller-specific rule configured

**Prevention:**
- Ensure `createProductWorkflow` (or equivalent) always creates the product→seller link immediately after product creation.
- When calling `getCommissionLinesStep`, pass a context where `item.product` is fully loaded via `remoteQuery` with `{ seller: true }` relations.
- Add an integration test: create product with seller, create order, verify commission line has non-zero amount.

**Phase:** VENDOR-02 (product creation), ADMIN-02 (commission management).

---

### MOD-V3: `seller_registration` feature flag must match API route registration

**What goes wrong:** `withMercur` accepts `featureFlags: { seller_registration: true }`. If this flag is `false`, the seller registration routes are not mounted. Any UI flow in the vendor panel that calls `/seller/registration` will get 404. Conversely, setting it `true` without having the corresponding workflow logic in place leaves the endpoint reachable but broken.

**Evidence in repo:** `medusa-config.ts` line 29: `seller_registration: true`. `withMercur` source does not show flag-gating of route registration directly (it delegates to the plugin), but the flag controls whether registration endpoints respond.

**Warning signs:**
- Vendor onboarding POST to `/seller/registration` returns 404 even though the code looks right
- Flag changed in env without restarting the server (env loaded via `loadEnv` at startup, not hot-reloaded)

**Prevention:**
- Always restart the Medusa server after changing feature flags — they are read at startup.
- Keep `seller_registration: true` in all non-production environments during development of VENDOR-01.
- Test the full registration POST endpoint with `curl` before building the vendor UI against it.

**Phase:** VENDOR-01.

---

### MOD-V4: `withMercur` auto-injects `@mercurjs/core` plugin — manual duplicate causes conflict

**What goes wrong:** `with-mercur.ts` lines 44-51: `withMercur` automatically adds `{ resolve: "@mercurjs/core", options: {} }` to `plugins[]` if not already present. If a developer also manually adds `@mercurjs/core` to `plugins` in `medusa-config.ts`, Medusa registers the plugin twice, causing duplicate module registrations and `Cannot register module X twice` startup errors.

**Evidence in repo:** Current `medusa-config.ts` does not add `@mercurjs/core` to plugins manually — it relies on `withMercur` to inject it. Risk exists if someone follows a Medusa plugin tutorial and adds it manually.

**Warning signs:**
- Server startup error: `Module already registered` or duplicate key constraint on startup
- Only happens after someone edits `medusa-config.ts`

**Prevention:**
- Never add `@mercurjs/core` to `plugins[]` manually when using `withMercur`.
- Document this in the project CLAUDE.md under "medusa-config.ts rules".

**Phase:** INFRA-01.

---

### MOD-V5: `vendorCors` is a Mercur-only extension — missing from Medusa type definitions

**What goes wrong:** `with-mercur.ts` extends `MercurInputConfig` to allow `vendorCors` in `http`, then passes it as `any`. Medusa's TypeScript types do not know about `vendorCors`. If you set `vendorCors` in `projectConfig.http`, TypeScript will not warn if you misspell it (`vendor_cors`, `VENDOR_CORS`). The middleware reads it via string key at runtime, so a typo produces `undefined` CORS origin → all vendor requests blocked.

**Evidence in repo:** `vendor-cors-middleware.ts` line 17: `configModule.projectConfig.http.vendorCors`. The `@ts-expect-error` comment confirms the type is not standard. `with-mercur.ts` passes `http` as `any`.

**Warning signs:**
- All vendor API calls fail with CORS error despite env var being set
- No TypeScript compile error warns you

**Prevention:**
- Treat `VENDOR_CORS` env var as required, not optional. Add a startup assertion:
  ```typescript
  if (!process.env.VENDOR_CORS) throw new Error('VENDOR_CORS is required')
  ```
- Validate CORS config at app startup, not at first request.

**Phase:** INFRA-01, VENDOR-01.

---

## Monorepo Pitfalls

### CRIT-R1: Workspace package COPY missing in Dockerfile — package not available in build context

**What goes wrong:** Docker `COPY` operates from build context root. For a workspace package used by another package, both the source and the dependent's `package.json` must be copied before `bun install`. If any workspace package's `package.json` is missing, bun silently creates an empty placeholder, install succeeds, but later build fails with `Cannot resolve module`.

**Evidence in repo:** `Dockerfile` lines 9-19 carefully lists every workspace package's `package.json`. `Dockerfile.vendor` lines 9-21 does the same. The missing file is `apps/vendor/package.json` in the API Dockerfile (correct — it is not needed there) and `apps/api/package.json` in the vendor Dockerfile (also correctly absent). Risk: any new workspace package added to `package.json` `workspaces` array must also get a `COPY` line in every Dockerfile.

**Warning signs:**
- `bun install` exits 0 but build fails: `Package @mercurjs/new-package not found`
- Only fails in Docker, works locally (local has the full filesystem)

**Prevention:**
- After adding a new workspace package: immediately add `COPY packages/new-pkg/package.json ./packages/new-pkg/` to all relevant Dockerfiles.
- Consider a Dockerfile linting step in CI that compares `workspaces` entries against COPY lines.

**Phase:** Ongoing — enforce at every new package addition.

---

### CRIT-R2: TypeScript project references — `packages/core` build is `|| true` (errors ignored)

**What goes wrong:** `Dockerfile` line 36: `RUN cd packages/core && bun run build || true`. The `|| true` suppresses build errors. If `packages/core` fails to compile, the Dockerfile continues and `apps/api` runs against an incomplete or stale `.medusa/server` output.

**Evidence in repo:** The comment says "upstream TS18046 errors don't affect runtime output." This is fragile: it assumes only TS18046 errors exist and any future real error will also be swallowed.

**Warning signs:**
- API container starts but certain Mercur workflows fail at runtime with `is not a function`
- No Docker build failure logged, but runtime errors appear

**Prevention:**
- Fix TS18046 errors properly instead of swallowing all errors.
- If upstream errors are truly cosmetic, filter specifically: `bun run build 2>&1 | grep -v TS18046 | tee /dev/stderr; exit 0` — but this is fragile.
- Best: track the upstream issue and remove `|| true` once fixed.

**Phase:** INFRA-01, flag as tech debt.

---

### MOD-R3: Turbo build outputs in `turbo.json` — outputs array covers `.next/**` only

**What goes wrong:** `turbo.json` `outputs` is `[".next/**", "!.next/cache/**"]`. This covers Next.js (storefront) but not Medusa API output (`.medusa/server/**`) or vendor Vite output (`dist/**`). If turbo is used locally (not in Docker where it is stripped), it will not cache API or vendor builds correctly — every run rebuilds from scratch.

**Evidence in repo:** `turbo.json` outputs array — missing `.medusa/**` and `dist/**` entries for api and vendor tasks.

**Warning signs:**
- Local `bun run build` always rebuilds api and vendor even when source is unchanged
- `turbo` cache-hit rate is 0% for api and vendor

**Prevention:**
- Update `turbo.json` to add per-package outputs:
  ```json
  "outputs": [".next/**", "!.next/cache/**", ".medusa/**", "dist/**"]
  ```
  Or configure per-pipeline in `pipeline` with `filter`.

**Phase:** Developer experience — address early in INFRA-01.

---

### MOD-R4: `vite.config.ts` `medusaConfigPath` is relative — breaks when Vite runs from different cwd

**What goes wrong:** `apps/vendor/vite.config.ts` passes `medusaConfigPath: '../../apps/api/medusa-config.ts'`. This is relative to the Vite process cwd. If `bunx vite build` is run from a directory other than `apps/vendor/` (e.g. from workspace root via turbo), the path resolves incorrectly and `dashboardPlugin` cannot load the config.

**Evidence in repo:** `vite.config.ts` line 7 — relative path `'../../apps/api/medusa-config.ts'`. In `Dockerfile.vendor` line 40: `RUN cd apps/vendor && bunx vite build` — the `cd` ensures correct cwd, so Docker is fine. Risk in local turbo runs.

**Warning signs:**
- `mercurDashboardPlugin` fails to load config: `ENOENT: no such file or directory`
- Virtual modules (`virtual:mercur/routes`) are empty

**Prevention:**
- Use `path.resolve(__dirname, '../../apps/api/medusa-config.ts')` in `vite.config.ts`.
- Or always run vendor build from `apps/vendor/` explicitly.

**Phase:** INFRA-01.

---

## Priority Matrix

| Priority | Pitfall | Why First | Phase |
|----------|---------|-----------|-------|
| P0 | CRIT-D1: Turbo Alpine binary | Blocks all Docker builds | INFRA-01 |
| P0 | CRIT-M1: CORS four surfaces | Blocks all cross-app API calls | INFRA-01 |
| P0 | CRIT-V1: Cookie SameSite/Secure | Blocks vendor auth entirely | VENDOR-01 |
| P1 | CRIT-D2: NEXT_PUBLIC_ bake-time | Silent wrong URL in browser | INFRA-01 |
| P1 | MOD-M2: Admin disable conflict | Admin-01 through Admin-04 broken | ADMIN-01 |
| P1 | CRIT-R2: `|| true` on core build | Silent runtime failures | INFRA-01 |
| P1 | CRIT-V2: Commission seller hydration | Commission zero-amount bug | VENDOR-02 |
| P2 | MOD-D4: No medusa healthcheck | Flaky startup race condition | INFRA-01 |
| P2 | MOD-M3: Migration ordering | Only fails on fresh DB | INFRA-02 |
| P2 | CRIT-R1: Missing COPY for new packages | Future-failure trap | Ongoing |
| P2 | MOD-V3: Feature flag startup only | Vendor onboarding 404 | VENDOR-01 |
| P2 | MOD-V4: Duplicate plugin injection | Silent conflict on mis-edit | INFRA-01 |
| P3 | MOD-D3: npm vs bun in prod | Potential install failure | INFRA-01 |
| P3 | MOD-M4: Connection pool | Only visible under load | STORE-02 |
| P3 | MOD-V5: vendorCors typo | Caught by testing | INFRA-01 |
| P3 | MOD-R3: Turbo outputs | DX only, not correctness | INFRA-01 |
| P3 | MOD-R4: Relative medusaConfigPath | DX only, Docker unaffected | INFRA-01 |
