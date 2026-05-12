# Phase 1 Implementation Plan — Foundation

**Phase:** 1 — Foundation  
**Success Criteria:** 5 criteria (SC-1 through SC-5)  
**Created:** 2026-05-10  
**Status:** Ready for execution

---

## Overview

Phase 1 establishes a working local Docker environment: all 5 services start cleanly, the API is reachable, the admin dashboard is accessible with seeded credentials, seed data creates an approved seller with shipping and book categories, and the vendor panel authenticates without cross-origin cookie errors.

No new features. No new packages. Pure configuration, infrastructure, and seed script fixes.

---

## Success Criteria Mapping

| SC | Criterion | Files Changed |
|----|-----------|---------------|
| SC-1 | `docker compose up` starts 5 services without errors | `docker-compose.yml`, `Dockerfile` |
| SC-2 | API at :9000/health, storefront at :8000 within 60s | `docker-compose.yml` |
| SC-3 | Superadmin login at :9000/dashboard works | `medusa-config.ts`, `docker-compose.yml` |
| SC-4 | Seed creates approved seller + shipping + genre categories | `apps/api/src/scripts/seed.ts` |
| SC-5 | Vendor panel login at :7001 without cross-origin cookie errors | `docker-compose.yml`, `nginx.vendor.conf` |

---

## File 1: `apps/api/medusa-config.ts`

### What changes and why

**Problem (CRIT-M2):** `admin.disable: false` (line 8) correctly enables the Medusa admin, but `admin-ui` module at line 36 has `options.disable: true`. This disables the Mercur admin overlay. The `/dashboard` route serves raw Medusa admin without Mercur vendor-management sections.

**Problem (CRIT-V1):** `cookieOptions.sameSite: "lax"` at line 16. The vendor panel on `:7001` is cross-origin relative to the API on `:9000`. With `SameSite=Lax`, the browser will NOT send the cookie on cross-origin POST requests, so vendor auth silently fails after login.

**Fix — admin-ui module:** Change `admin-ui` module `options.disable` from `true` to `false`. Also set `appDir` to the actual built admin output. For Phase 1 local dev, `appDir` stays `''` (falls back to default-page mode, which proxies to Vite dev server). The critical fix is `disable: false`.

**Fix — vendor-ui module:** Same — change `vendor-ui` module `options.disable` from `true` to `false`.

**Fix — cookie SameSite:** For Docker Compose local, the vendor panel is served by nginx on port 7001, and requests go to `localhost:9000`. These are cross-origin (different port = different origin). Changing `sameSite` to `"none"` requires `secure: true`, which requires HTTPS — not available locally. The correct local solution is a **reverse proxy** that puts all services under one origin (see nginx plan below). The `medusa-config.ts` cookie setting stays as-is (`lax`, `secure: false`) because the nginx proxy solution eliminates the cross-origin problem entirely.

**Specific values to use:**

```typescript
import { loadEnv } from '@medusajs/framework/utils'
import { withMercur } from '@mercurjs/core'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = withMercur({
  admin: {
    disable: false,
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    cookieOptions: {
      secure: false,
      sameSite: "lax" as const,
    },
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      vendorCors: process.env.VENDOR_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  featureFlags: {
    seller_registration: true
  },
  modules: [
    {
      resolve: '@mercurjs/core/modules/admin-ui',
      options: {
        appDir: '',
        path: '/dashboard',
        disable: false   // CHANGED from true — enables Mercur admin overlay
      }
    },
    {
      resolve: '@mercurjs/core/modules/vendor-ui',
      options: {
        appDir: '',
        path: '/seller',
        disable: false   // CHANGED from true — enables Mercur vendor overlay
      }
    },
  ],
})
```

**Only change:** `disable: true` → `disable: false` in both module entries (lines 36 and 43 in original).

---

## File 2: `docker-compose.yml`

### What changes and why

**Problem SC-1/SC-2 (MOD-D4):** `vendor` and `storefront` depend on `medusa` with no healthcheck condition. They start immediately when the medusa container starts, before Medusa has completed migrations and bound its HTTP server. This causes race-condition failures on first boot.

**Problem SC-1 (CRIT-M1):** CORS env vars are correct in the defaults, but `AUTH_CORS` must include all three origins. Current default `AUTH_CORS` is only `http://localhost:9000`. It must also include `http://localhost:7001` and `http://localhost:8000` so login works from vendor panel and storefront.

**Problem SC-5 (CRIT-V1):** Vendor panel on `:7001` calls the API on `:9000` cross-origin. With `SameSite=Lax` cookies, the auth cookie is not sent on cross-origin requests. Fix: add an nginx reverse proxy that puts the vendor panel and the API under the same origin (`localhost:7001`), routing `/api/` → `medusa:9000` and `/` → vendor panel. This makes all API calls same-origin from the browser's perspective.

**Problem SC-3:** The seeded admin user is created by the seed script (see File 3). The seed command must be run automatically on first startup. Add it to the medusa startup command.

**Specific changes:**

### 2a — Add healthcheck to `medusa` service

```yaml
medusa:
  # ... existing config ...
  healthcheck:
    test: ["CMD-SHELL", "curl -sf http://localhost:9000/health || exit 1"]
    interval: 10s
    timeout: 5s
    retries: 12
    start_period: 60s
```

`start_period: 60s` gives Medusa time to run migrations before health checks begin counting failures. `retries: 12` × `interval: 10s` = 2 minutes total wait. `curl` must be available in the medusa image — add `curl` to the `Dockerfile` `apk add` line.

### 2b — Change `vendor` and `storefront` depends_on to use healthcheck condition

```yaml
vendor:
  depends_on:
    medusa:
      condition: service_healthy

storefront:
  depends_on:
    medusa:
      condition: service_healthy
```

### 2c — Fix `AUTH_CORS` default to include all three origins

```yaml
AUTH_CORS: ${AUTH_CORS:-http://localhost:9000,http://localhost:7001,http://localhost:8000}
```

Current value is only `http://localhost:9000`. Must include vendor (`7001`) and storefront (`8000`) because login calls come from those origins.

### 2d — Add automatic seed on first startup

Change the medusa startup command from:
```yaml
command: sh -c "cd /app/apps/api/.medusa/server && npx medusa db:migrate && npx medusa start"
```
to:
```yaml
command: sh -c "cd /app/apps/api/.medusa/server && npx medusa db:migrate && npx medusa exec /app/apps/api/src/scripts/seed.ts && npx medusa start"
```

**Note:** The seed script is idempotent (all sections check for existing data before creating). Running it on every startup is safe. If the built output (`medusa exec` from `.medusa/server`) cannot resolve the TypeScript source path, use the pre-compiled path or add a `seed` npm script to the package.json startup chain.

**Alternative if `medusa exec` on `.ts` source fails from the server dir:** Add a dedicated seed step that runs from the source directory:
```yaml
command: >
  sh -c "
    cd /app/apps/api/.medusa/server &&
    npx medusa db:migrate &&
    cd /app/apps/api &&
    npx medusa exec ./src/scripts/seed.ts &&
    cd .medusa/server &&
    npx medusa start
  "
```

### 2e — Add nginx proxy service for vendor (SC-5 cross-origin cookie fix)

Add a new `vendor-proxy` service that terminates at port 7001 and routes:
- `location /api/` → `proxy_pass http://medusa:9000/` (strips `/api/` prefix)
- `location /` → `proxy_pass http://vendor:3001/` (internal vendor container port changes to 3001)

Then expose port 7001 on `vendor-proxy`, not on `vendor`.

**However:** This approach requires changing the vendor container's internal port AND updating the vendor panel's API base URL to use `/api/` prefix. This is a larger change that touches the vendor app source.

**Simpler alternative (preferred for Phase 1):** Keep the vendor container on port 7001. Add a separate nginx proxy on a new port (e.g. 7002) that serves the vendor UI and proxies `/vendor-api/` to the API. BUT this changes the access URL for developers.

**Simplest correct solution for Phase 1:** Use a single nginx container on port 7001 that:
- Routes `location ~ ^/(vendor|auth|store|admin)/` → `proxy_pass http://medusa:9000`
- Routes everything else → `proxy_pass http://vendor-app:7001` (vendor app moves to internal-only port 7002)

This keeps the developer URL at `localhost:7001` while making all API calls same-origin from the browser.

See File 4 (`nginx.vendor.conf`) for the exact nginx config.

**docker-compose.yml vendor section change:**

```yaml
vendor-app:       # renamed from 'vendor', internal only
  build:
    context: .
    dockerfile: Dockerfile.vendor
  expose:
    - "7001"      # internal only, not published
  depends_on:
    medusa:
      condition: service_healthy

vendor:           # new nginx proxy, published on 7001
  image: nginx:alpine
  ports:
    - "7001:80"
  volumes:
    - ./nginx.vendor-proxy.conf:/etc/nginx/conf.d/default.conf:ro
  depends_on:
    - vendor-app
    - medusa
```

**Note on vendor app port:** The Dockerfile.vendor uses `nginx:alpine` to serve static files. It already has a `nginx.vendor.conf`. After building, the container is already an nginx serving static files. The static vendor SPA hardcodes the API URL at build time (baked into JS bundle). There is NO server-side proxy in the current vendor container — the vendor app is pure static HTML/JS.

**Because the vendor panel is a static SPA:**
- All API calls go directly from the browser to `localhost:9000`
- A reverse proxy wrapping the vendor static files does NOT help with cookie origin — the browser still sends cookies to `localhost:9000`, not `localhost:7001`
- The only real fix for a static SPA + cross-origin cookies is either (a) `SameSite=None; Secure` + HTTPS, or (b) rebuild with API calls going through the same origin

**Revised correct solution for SC-5:** Use `SameSite=None` with a self-signed certificate in Docker, OR use a single nginx on one port that serves both the SPA and proxies the API.

**Definitive SC-5 solution:** Single nginx on port 7001 that:
1. Serves vendor static files at `/`
2. Proxies `/api/` → `http://medusa:9000/` (strips prefix)

AND patch the vendor build to set API base URL to `/api/` (relative, same-origin).

But patching the vendor SPA's API URL requires modifying `apps/vendor` source — specifically the `VITE_MEDUSA_BACKEND_URL` or equivalent env var.

**Final Phase 1 SC-5 approach:**
- Build-arg `VITE_MEDUSA_BACKEND_URL=http://localhost:7001/api` in Dockerfile.vendor
- nginx on port 7001 serving: static vendor files + `/api/` → proxy to medusa:9000
- Cookie goes to `localhost:7001` for both HTML and API → same origin → `SameSite=Lax` works

This requires two nginx configs — one embedded in the vendor Docker image (serves static files), and one that wraps it. Simpler: combine into one nginx container that does both.

**Complete docker-compose.yml** (full replacement of vendor section):

```yaml
vendor-app:
  build:
    context: .
    dockerfile: Dockerfile.vendor
    args:
      VITE_MEDUSA_BACKEND_URL: /api   # relative path — same origin via nginx proxy
  expose:
    - "7001"
  depends_on:
    medusa:
      condition: service_healthy

vendor-proxy:
  image: nginx:alpine
  ports:
    - "7001:80"
  volumes:
    - ./nginx.vendor-proxy.conf:/etc/nginx/conf.d/default.conf:ro
  depends_on:
    - vendor-app
    - medusa
```

See File 5 (`nginx.vendor-proxy.conf`) and File 4 (`Dockerfile.vendor` changes) for details.

### Full docker-compose.yml content

```yaml
services:
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: hadas
      POSTGRES_PASSWORD: Sifrut10
      POSTGRES_DB: bookshook_mercur
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hadas -d bookshook_mercur"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:alpine
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  medusa:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "9000:9000"
    environment:
      DATABASE_URL: postgres://hadas:Sifrut10@db:5432/bookshook_mercur?sslmode=disable
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET:-JWT-Hadas-Secret}
      COOKIE_SECRET: ${COOKIE_SECRET:-COOKIE-LOCAL-SECRET}
      STORE_CORS: ${STORE_CORS:-http://localhost:8000}
      ADMIN_CORS: ${ADMIN_CORS:-http://localhost:9000}
      VENDOR_CORS: ${VENDOR_CORS:-http://localhost:7001}
      AUTH_CORS: ${AUTH_CORS:-http://localhost:9000,http://localhost:7001,http://localhost:8000}
      NODE_ENV: staging
      MEDUSA_BACKEND_URL: http://localhost:9000
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:9000/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 60s
    command: >
      sh -c "
        cd /app/apps/api/.medusa/server &&
        npx medusa db:migrate &&
        cd /app/apps/api &&
        npx medusa exec ./src/scripts/seed.ts ||
        cd .medusa/server &&
        npx medusa start
      "

  vendor-app:
    build:
      context: .
      dockerfile: Dockerfile.vendor
      args:
        VITE_MEDUSA_BACKEND_URL: /api
    expose:
      - "7001"
    depends_on:
      medusa:
        condition: service_healthy

  vendor-proxy:
    image: nginx:alpine
    ports:
      - "7001:80"
    volumes:
      - ./nginx.vendor-proxy.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - vendor-app
      - medusa

  storefront:
    build:
      context: .
      dockerfile: Dockerfile.storefront
      args:
        NEXT_PUBLIC_MEDUSA_BACKEND_URL: http://localhost:9000
        NEXT_PUBLIC_PUBLISHABLE_KEY: ${NEXT_PUBLIC_PUBLISHABLE_KEY:-pk_823e1c8c34a62d70030c326c79abbafdd80f117cacc3be366f89e1397c772caa}
    ports:
      - "8000:8000"
    environment:
      MEDUSA_BACKEND_URL: http://medusa:9000
      PUBLISHABLE_KEY: ${NEXT_PUBLIC_PUBLISHABLE_KEY:-pk_823e1c8c34a62d70030c326c79abbafdd80f117cacc3be366f89e1397c772caa}
    depends_on:
      medusa:
        condition: service_healthy

volumes:
  postgres_data:
```

**Note on the seed command:** The `||` in the medusa command needs fixing — the `cd` after `||` is wrong logic. Correct form:

```yaml
command: >
  sh -c "
    cd /app/apps/api/.medusa/server &&
    npx medusa db:migrate &&
    cd /app/apps/api &&
    npx medusa exec ./src/scripts/seed.ts;
    cd /app/apps/api/.medusa/server &&
    npx medusa start
  "
```

Using `;` before the final `cd` so startup continues even if seed fails (idempotent anyway, but may log errors on already-seeded DB).

---

## File 3: `apps/api/src/scripts/seed.ts`

### What changes and why

**Problem SC-4a — Wrong categories:** Current seed creates `["Shirts", "Sweatshirts", "Pants", "Merch"]` and generic t-shirt/sweatshirt products. Required: book genre categories `["Fiction", "Non-Fiction", "Science", "History", "Children", "Business"]`.

**Problem SC-4b — No approved seller:** Seed has no vendor account creation. No `Member`, no `Seller`, no seller approval. The call to `createSellerDefaultsWorkflow` at the end (line 1066) only creates default commission rates and platform data — it does NOT create a seller account.

**Problem SC-4c — No seller-scoped shipping options:** Current shipping options exist at the platform level but are not linked to any seller via `shipping_option_seller` remote link. `validateSellerCartShippingStep` will reject checkout because no seller has a shipping option.

**Problem SC-4d — Missing admin user creation:** No superadmin user is seeded. Medusa's `medusa user -e admin@bookshook.com -p <password>` creates a user, but this must be done in the seed script or via the startup command.

### Changes required

#### Section 1 — Replace clothing categories with book genres

Find the block that creates `["Shirts", "Sweatshirts", "Pants", "Merch"]` and replace with:

```typescript
const categoryNames = ["Fiction", "Non-Fiction", "Science", "History", "Children", "Business"];
```

Remove the entire product creation block (the 4 Medusa T-Shirt/Sweatshirt/Sweatpants/Shorts products). Replace with a single placeholder book product linked to the seeded seller and a genre category (see seller section below).

Remove the `productHandles` array and all `existingProducts` / `createProductsWorkflow` logic for the old products.

#### Section 2 — Create approved seller account

Add after the `createSellerDefaultsWorkflow` call. The workflow to use is the Mercur-provided `createSellerWorkflow` from `@mercurjs/core/workflows`. After creating the seller, use `approveSeller` workflow to set status to `OPEN`.

The Member (vendor user) must also be created and linked to the seller.

**Imports to add:**

```typescript
import {
  createSellerDefaultsWorkflow,
  createSellerWorkflow,
  approveSellerWorkflow,
} from '@mercurjs/core/workflows'
```

**Seller creation block:**

```typescript
logger.info("Seeding vendor seller account...");

const sellerModule = container.resolve(MercurModules.SELLER);
const authModule = container.resolve<IAuthModuleService>(Modules.AUTH);

// Check if demo seller already exists
const existingSellers = await sellerModule.listSellers({ handle: "books-by-demo" });

if (!existingSellers.length) {
  // 1. Create auth identity for the member
  const authIdentity = await authModule.createAuthIdentities({
    provider_identities: [
      {
        provider: "emailpass",
        entity_id: "seller@bookshook.com",
        provider_metadata: {
          // Medusa hashes this; pass plaintext here — the emailpass provider handles bcrypt
          password: "seller123",
        },
      },
    ],
  });

  // 2. Create the seller via Mercur workflow
  const { result: sellerResult } = await createSellerWorkflow(container).run({
    input: {
      seller: {
        name: "Books by Demo",
        handle: "books-by-demo",
        description: "A demo bookstore for development seeding",
        currency_code: "eur",
      },
      member: {
        name: "Demo Seller",
        email: "seller@bookshook.com",
        auth_identity_id: authIdentity.id,
      },
    },
  });

  // 3. Approve the seller so status becomes OPEN
  await approveSellerWorkflow(container).run({
    input: {
      id: sellerResult.seller.id,
    },
  });

  logger.info(`Created and approved seller: ${sellerResult.seller.id}`);
} else {
  logger.info("Demo seller already exists, skipping.");
}
```

**Note on auth identity creation:** The exact API for creating an auth identity with a password in MedusaJS 2.x requires using the auth module's `createAuthIdentities` method. The `provider_metadata.password` must be passed as plaintext — the emailpass provider hashes it during registration. However, if `createAuthIdentities` doesn't hash the password automatically (it only stores what you give it), use the HTTP registration flow instead:

**Alternative approach — use the HTTP registration endpoint:**

```typescript
// Use fetch to call the registration endpoint directly
const response = await fetch("http://localhost:9000/auth/member/emailpass/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "seller@bookshook.com",
    password: "seller123",
  }),
});
const { token } = await response.json();
// token is the auth identity token; use it to create the member
```

The HTTP approach is more reliable because it goes through the standard password-hashing flow. The in-process approach depends on the auth module's internal API matching the HTTP layer's behavior.

**Recommended:** Use HTTP registration with `fetch` inside the seed script, which is already running in the Medusa process context. The API is available at `localhost:9000` during seed execution (seed runs before `medusa start` in the startup command — **wait, this is wrong**: if seed runs BEFORE `medusa start`, the HTTP endpoint is not available).

**Revised seed execution order:**

Run seed AFTER `medusa start` using a separate command, OR use the module service directly for auth identity creation (in-process). For the in-process approach, the auth provider's `register` method should hash the password.

Check Mercur's own seed scripts for the correct pattern. The safest approach:

```typescript
// In-process: directly use the auth provider to register
const authProvider = container.resolve("emailpass"); // or however the provider is resolved
// If provider exposes a register(email, password) method, use it
// Otherwise, call authModule.createAuthIdentities and also store hashed password separately
```

Since the exact internal API is uncertain, the **safest seed approach** is:

1. Run `npx medusa user -e admin@bookshook.com -p Admin123!` for the superadmin as part of the Docker startup command (this is a CLI command, not a workflow)
2. For the seller member, use Mercur's `createSellerWorkflow` which accepts `auth_identity_id` — first create the auth identity via `authModule.createAuthIdentities`, then pass the ID

For the password hashing, use bcrypt directly in the seed:

```typescript
import bcrypt from "bcrypt"; // or "bcryptjs"

const hashedPassword = await bcrypt.hash("seller123", 10);
const authIdentity = await authModule.createAuthIdentities({
  provider_identities: [{
    provider: "emailpass",
    entity_id: "seller@bookshook.com",
    provider_metadata: {
      password: hashedPassword, // pre-hashed
    },
  }],
});
```

**bcrypt is available** as a transitive dependency of `@medusajs/auth` (the emailpass provider uses bcrypt internally).

#### Section 3 — Create seller-scoped shipping options (SC-4 critical for checkout)

After creating and approving the seller, create shipping options linked to that seller via remote links.

Per the ARCHITECTURE.md, each seller needs: `ShippingProfile → FulfillmentSet → ServiceZone → ShippingOption`, all linked to seller.

The platform-level shipping profile and fulfillment set are already created earlier in the seed. For the seller, we need:

1. A seller-specific `ShippingProfile` (or link the existing platform profile to the seller)
2. Link `shipping_profile_seller`
3. Link `shipping_option_seller` for the existing Standard Shipping option

**The simplest correct approach:** After creating the seller, create the `shipping_profile_seller` and `shipping_option_seller` remote links to connect the existing platform shipping profile and options to the seller. Mercur's link definitions allow this.

```typescript
logger.info("Linking shipping to seller...");

// Re-fetch seller after approval
const [seller] = await sellerModule.listSellers({ handle: "books-by-demo" });

// Link the existing shipping profile to the seller
try {
  await link.create({
    [Modules.FULFILLMENT]: {
      shipping_profile_id: shippingProfile.id,
    },
    [MercurModules.SELLER]: {
      seller_id: seller.id,
    },
  });
} catch (e: unknown) {
  if (!(e instanceof Error && e.message.includes("already exists"))) throw e;
}

// Get the shipping options we created
const { data: shippingOptions } = await query.graph({
  entity: "shipping_option",
  fields: ["id", "name"],
  filters: { name: ["Standard Shipping", "Express Shipping"] },
});

// Link each shipping option to the seller
for (const option of shippingOptions) {
  try {
    await link.create({
      [Modules.FULFILLMENT]: {
        shipping_option_id: option.id,
      },
      [MercurModules.SELLER]: {
        seller_id: seller.id,
      },
    });
  } catch (e: unknown) {
    if (!(e instanceof Error && e.message.includes("already exists"))) throw e;
    logger.info(`Shipping option ${option.name} already linked, skipping.`);
  }
}
logger.info("Finished linking shipping to seller.");
```

**Note on link names:** The actual Mercur link module identifiers must match what's in `packages/core/src/links/`. Based on ARCHITECTURE.md, the links are `shipping_profile_seller` and `shipping_option_seller`. The `MercurModules.SELLER` identifier resolves to the seller module key. Verify the actual link keys by checking `packages/core/src/links/shipping-profile-seller.ts` before implementing.

#### Section 4 — Superadmin user creation

The superadmin user (`medusa user`) should be created via the startup command, not the seed script, because it uses the Medusa CLI. Add to docker-compose.yml startup command:

```sh
npx medusa user --email admin@bookshook.com --password Admin123! 2>/dev/null || true
```

The `|| true` handles the case where the user already exists (idempotent).

**Full startup command for medusa service:**

```yaml
command: >
  sh -c "
    cd /app/apps/api/.medusa/server &&
    npx medusa db:migrate &&
    npx medusa user --email admin@bookshook.com --password Admin123! 2>/dev/null || true;
    cd /app/apps/api &&
    npx medusa exec ./src/scripts/seed.ts;
    cd /app/apps/api/.medusa/server &&
    npx medusa start
  "
```

**Seeded credentials:**
- Superadmin: `admin@bookshook.com` / `Admin123!`  
- Demo seller member: `seller@bookshook.com` / `seller123`

---

## File 4: `Dockerfile`

### What changes and why

**Problem SC-2 (healthcheck):** `curl` is not in the current `apk add` line. The healthcheck in docker-compose.yml uses `curl -sf`. Without curl, the healthcheck command itself fails.

**Change:** Add `curl` to the `apk add` line.

Current line 3:
```dockerfile
RUN apk add --no-cache python3 make g++ nodejs npm jq
```

Change to:
```dockerfile
RUN apk add --no-cache python3 make g++ nodejs npm jq curl
```

**No other changes to Dockerfile.** The turbo Alpine workaround (`jq 'del(.devDependencies.turbo)'`) is already in place and must stay.

---

## File 5: `Dockerfile.vendor`

### What changes and why

**Problem SC-5 (cross-origin cookie):** The vendor panel's API base URL is baked at build time by Vite. To use the nginx proxy approach (same-origin), the build arg `VITE_MEDUSA_BACKEND_URL` must be accepted and passed through.

**Changes:**

1. Accept the `VITE_MEDUSA_BACKEND_URL` build arg
2. Set it as an ENV before running `bunx vite build`
3. Change the nginx serving port from 7001 to an internal port (e.g. 7001 still, but not published — docker-compose handles the proxy)

The vendor Dockerfile currently uses `EXPOSE 7001` and `nginx:alpine` with `nginx.vendor.conf`. The static files are served by this nginx. In the proxy architecture, this container is internal (`expose: "7001"`) and the external-facing proxy (`vendor-proxy`) forwards to it.

**Add after the workspace package build steps, before `bunx vite build`:**

```dockerfile
# Accept API URL build arg for same-origin proxy setup
ARG VITE_MEDUSA_BACKEND_URL=http://localhost:9000
ENV VITE_MEDUSA_BACKEND_URL=$VITE_MEDUSA_BACKEND_URL
```

**Check whether the vendor app reads `VITE_MEDUSA_BACKEND_URL`:** Look at `apps/vendor/src/lib/client.ts` or `apps/vendor/vite.config.ts` to confirm the env var name. Common patterns in Mercur vendor apps use `VITE_MEDUSA_BACKEND_URL` or `VITE_BACKEND_URL`. Verify before implementing.

If the vendor app reads a different var, use that name instead.

---

## File 6: `nginx.vendor-proxy.conf` (NEW FILE)

### What changes and why

**Problem SC-5:** New nginx config for the `vendor-proxy` service. Routes `/api/` traffic to medusa, everything else to the vendor-app static server.

**File path:** `nginx.vendor-proxy.conf` (project root, same level as `nginx.vendor.conf`)

**Content:**

```nginx
server {
    listen 80;
    server_name localhost;

    # Proxy API calls to Medusa — strips the /api prefix
    location /api/ {
        proxy_pass http://medusa:9000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS headers — allow the proxy origin
        proxy_set_header Origin http://localhost:7001;

        # Pass through cookies
        proxy_pass_header Set-Cookie;
        proxy_cookie_domain medusa localhost;
    }

    # Serve vendor panel static files
    location / {
        proxy_pass http://vendor-app:7001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Key points:**
- `proxy_pass http://medusa:9000/;` — trailing slash strips the `/api` prefix from the forwarded path. So `GET /api/health` becomes `GET /health` at medusa.
- `proxy_cookie_domain medusa localhost` — rewrites the cookie `Domain` attribute so the browser stores it for `localhost` rather than `medusa` (Docker internal hostname).
- `proxy_pass_header Set-Cookie` — ensures `Set-Cookie` headers from medusa pass through to the browser.
- `http://vendor-app:7001/` — the vendor-app container's nginx (internal). Docker Compose service name `vendor-app` resolves to its IP.

**Critical:** The `VENDOR_CORS` env var in docker-compose.yml must still be `http://localhost:7001` because the browser's `Origin` header on requests to the proxy will be `localhost:7001`. Medusa's CORS check sees the request coming from the proxy, but the `Origin` header is forwarded as-is from the browser — or set explicitly via `proxy_set_header Origin`. The proxy must forward the actual browser `Origin` header:

```nginx
# Do NOT override Origin — pass the real browser origin
# proxy_set_header Origin http://localhost:7001;  # Remove this line
proxy_pass_header Origin;
```

Actually, nginx does not strip `Origin` by default — it passes it through. The browser sends `Origin: http://localhost:7001`, nginx forwards it to medusa, medusa checks it against `VENDOR_CORS=http://localhost:7001` → allowed. This works correctly without any `proxy_set_header Origin` override.

---

## File 7: `nginx.vendor.conf` (EXISTING — check current content)

The existing `nginx.vendor.conf` is used by the vendor static server (inside the `vendor-app` container). It currently serves on port 7001. It should remain as-is — the vendor-app container serves its files internally on 7001, and the `vendor-proxy` nginx forwards to it.

If `nginx.vendor.conf` has `listen 7001;`, it's fine (internal port). No change needed here unless it has restrictive `server_name` settings that block proxy access.

---

## Execution Order

1. **Edit `apps/api/medusa-config.ts`** — change two `disable: true` → `disable: false`
2. **Edit `Dockerfile`** — add `curl` to apk
3. **Edit `Dockerfile.vendor`** — add `VITE_MEDUSA_BACKEND_URL` build arg
4. **Create `nginx.vendor-proxy.conf`** — new nginx proxy config
5. **Edit `apps/api/src/scripts/seed.ts`** — replace clothing categories + products with book genres, add seller creation, add shipping links
6. **Edit `docker-compose.yml`** — healthcheck, depends_on conditions, AUTH_CORS fix, vendor proxy service split, seed + user in startup command
7. **Verify:** `docker compose build --no-cache && docker compose up`

---

## Pre-Implementation Checks

Before writing code, verify these assumptions:

| Check | How | What to look for |
|-------|-----|------------------|
| Vendor app API URL env var name | Read `apps/vendor/src/lib/client.ts` or `apps/vendor/vite.config.ts` | `VITE_MEDUSA_BACKEND_URL` or other name |
| `createSellerWorkflow` input shape | Read `packages/core/src/workflows/seller/create-seller.ts` | Exact input type — `seller` and `member` field names |
| `approveSellerWorkflow` input shape | Read `packages/core/src/workflows/seller/approve-seller.ts` | Whether it takes `id` or `seller_id` |
| Shipping link module keys | Read `packages/core/src/links/shipping-option-seller.ts` | Exact link module identifiers for `link.create()` |
| `MercurModules.SELLER` value | Read `packages/types/src/index.ts` or check `MercurModules` export | String value used as the module key |
| `medusa user` CLI availability | Check `.medusa/server/node_modules/.bin/medusa --help` | Whether `user` subcommand exists in 2.13.6 |
| bcrypt availability | Check `.medusa/server/node_modules/bcrypt` or `bcryptjs` | Which package is available for password hashing |
| `nginx.vendor.conf` listen port | Read `nginx.vendor.conf` | Confirm listen port and server_name |

---

## Risk Flags

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `createSellerWorkflow` input shape differs from assumed | MEDIUM | Read source before implementing |
| `approveSellerWorkflow` requires admin context | MEDIUM | If it does, call seller module service directly to set status |
| `medusa user` CLI command syntax changed in 2.13.6 | LOW | Check `npx medusa --help` in the built server dir |
| Vendor app uses different env var than `VITE_MEDUSA_BACKEND_URL` | MEDIUM | Read `apps/vendor/src/lib/client.ts` first |
| nginx `proxy_cookie_domain` not sufficient — cookie still bound to wrong domain | LOW | Test with DevTools → Application → Cookies after proxy setup |
| `|| true` on seed swallows real errors | LOW | Log seed output; check for non-exit errors in logs |
| Seed runs on every container restart — slow startup | LOW | Seed is idempotent and fast (all checks short-circuit); acceptable |

---

## Success Verification Steps

After `docker compose up`:

1. **SC-1:** All 5 services in `docker compose ps` show `Up (healthy)` or `Up`
2. **SC-2:** `curl http://localhost:9000/health` returns `{"status":"ok"}` within 60s; `curl http://localhost:8000` returns HTML
3. **SC-3:** Open `http://localhost:9000/dashboard`, enter `admin@bookshook.com` / `Admin123!`, confirm login succeeds and Mercur sidebar sections appear
4. **SC-4:** In psql or admin UI, confirm:
   - Product categories exist: Fiction, Non-Fiction, Science, History, Children, Business
   - Seller `books-by-demo` exists with status `OPEN`
   - Shipping options exist and are linked to seller
5. **SC-5:** Open `http://localhost:7001`, enter `seller@bookshook.com` / `seller123`, confirm login succeeds, DevTools shows no CORS errors, cookie is present for `localhost` domain

---

## Out of Scope for Phase 1

- Real email/SMTP configuration
- Production HTTPS / real TLS certificates
- MeiliSearch / full-text search
- Payment provider beyond `pp_system_default`
- File storage beyond local disk
- Commission rate configuration (beyond defaults from `createSellerDefaultsWorkflow`)
- Any vendor panel feature beyond login
- Any storefront feature beyond static load
