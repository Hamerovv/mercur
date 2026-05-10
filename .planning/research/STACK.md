# Stack Research — Mercur.js Marketplace

**Project:** bookshook
**Researched:** 2026-05-10
**Source basis:** Direct inspection of all package.json files in the monorepo + source code analysis

---

## Recommended Stack

### Backend

| Technology | Pinned Version | Role |
|------------|---------------|------|
| `@medusajs/medusa` | **2.13.6** | Core commerce engine |
| `@medusajs/framework` | **2.13.6** | DI container, module system, workflow runner |
| `@medusajs/cli` | **2.13.6** | `medusa develop` / `medusa build` |
| `@medusajs/dashboard` | **2.13.6** | Superadmin UI served at `/dashboard` |
| `@medusajs/admin-sdk` | **2.13.6** | Admin extension API |
| `@medusajs/admin-shared` | **2.13.6** | Shared types between admin + vendor |
| `@medusajs/draft-order` | **2.13.6** | Draft-order module (optional feature) |
| `@medusajs/core-flows` | **^2.13.4** (peer) | Pre-built workflows (upload, order, etc.) |
| `@mercurjs/core` | **2.0.2** (workspace `*`) | Multi-vendor plugin — all seller/commission/payout logic |
| `@mercurjs/cli` | **2.0.2** (workspace `*`) | `mercurjs develop` / `mercurjs start` replaces medusa CLI |
| `@mercurjs/types` | **2.0.2** (workspace `*`) | Shared DTO types (SellerDTO, etc.) |
| PostgreSQL | **15** | Primary store |
| Redis | **latest** | Cache + BullMQ job queue |
| Node.js | **>=20** | Runtime (engines field enforced) |
| Bun | **1.3.8** | Package manager + monorepo workspace runner |
| Turborepo | **^2.7.4** | Task graph + build cache |

**Key detail:** In this repo `@mercurjs/core` is a **workspace package** (`packages/core`), not an npm package. The api app resolves it with `"@mercurjs/core": "*"`. On the published basic template it would be `@mercurjs/core-plugin: 2.0.2`. Keep this in mind: do not update to a newer published npm version of `@mercurjs/core` without also updating the workspace source.

**Auth model:** Vendor endpoints live at `/vendor/*` and use MedusaJS `authenticate("member", ["session", "bearer"])` middleware. The `member` actor type is distinct from `customer` and `user`. Cookies (`credentials: 'include'`) is the default credential strategy — no explicit JWT management required in the client.

### Storefront

| Technology | Pinned Version | Role |
|------------|---------------|------|
| Next.js | **^14.2.29** | App Router, RSC, server-side SDK calls |
| React | **^18.3.1** | UI runtime |
| `@medusajs/js-sdk` | **^2.13.0** | Official Medusa store API client (replaces `@medusajs/medusa-js`) |
| Tailwind CSS | **^3.4.1** | Styling |
| TypeScript | **^5** | Types |

**API client pattern (storefront):** Use `@medusajs/js-sdk` (`Medusa` class) for all store API calls. Two instances:
- `serverSdk` — server-side in RSC/server actions, points to internal Docker URL
- `sdk` — `"use client"` components, points to public URL

Do not use raw fetch for store API calls — the SDK handles publishable key headers, cookie auth, and type safety automatically.

**Storefront rendering model:** App Router with `export const revalidate = 60` for product pages is correct. Do not reach for client-side React Query in the storefront — RSC + route caching handles it.

### Vendor Panel

| Technology | Pinned Version | Role |
|------------|---------------|------|
| React | **^18.3.1** | UI runtime |
| Vite | **^5.4.21** | Dev server + bundler |
| `@mercurjs/vendor` | **2.0.2** (workspace) | Pre-built vendor UI pages — mount as `<App />` in main.tsx |
| `@mercurjs/dashboard-sdk` | **2.0.2** (workspace) | Vite plugin: file-based routing, virtual modules, HMR |
| `@mercurjs/dashboard-shared` | **2.0.2** (workspace) | Shared UI components between admin and vendor dashboards |
| `@mercurjs/client` | **2.0.2** (workspace) | Typed API client for `/vendor/*` endpoints |
| `@medusajs/ui` | **4.1.1** (pinned exact) | MedusaJS design system — **pin this exact version** |
| `@medusajs/icons` | **^2.13.4** | Icon set matching UI version |
| `@tanstack/react-query` | **5.64.2** (pinned exact) | Server-state management |
| `@tanstack/react-table` | **8.20.5** | Table primitives |
| `react-router-dom` | **6.30.3** (pinned exact) | Client routing |
| `react-hook-form` | **7.49.1** (pinned exact) | Form state |
| `@hookform/resolvers` | **3.4.2** | Zod integration for RHF |
| `zod` | **3.25.76** (pinned exact) | Schema validation |
| `react-i18next` | **13.5.0** (pinned exact) | i18n |
| `i18next` | **23.7.11** | i18n core |
| `radix-ui` | **1.1.2** | Headless primitives (umbrella package) |
| `react-jwt` | **^2.0.0** | JWT decode (display-only, no signing) |
| `jsonwebtoken` | **9.0.2** | JWT operations |
| TypeScript | **5.9.3** (pinned exact) | Types — **do not upgrade to 6.x without verifying Medusa compatibility** |

**State management verdict: TanStack Query (no Zustand, no Context API for server state)**

This is already decided by the codebase and packages. `@mercurjs/client` ships with `@tanstack/react-query` as a direct dependency. The existing `use-me.ts` hook shows the correct pattern:

```typescript
// packages/client depends on @tanstack/react-query 5.64.2
// vendor/src/hooks/use-me.ts
export const useMe = () => {
  const { data, ...rest } = useQuery({
    queryKey: ['members', 'me'],
    queryFn: () => client.vendor.members.me.query(),
  });
  return { ...data, ...rest };
};
```

- React Query: ALL server-state (products, orders, sellers, analytics)
- React Context: auth token / current user only (thin layer)
- Zustand: do not add — unnecessary complexity, React Query covers mutations + cache

**API client verdict: `@mercurjs/client` (not raw fetch, not `@medusajs/js-sdk`)**

The vendor panel must use `@mercurjs/client`'s `createClient()` with types inferred from `@mercurjs/core/_generated`. This gives full type inference across every `/vendor/*` endpoint. Pattern is already established in `apps/vendor/src/lib/client.ts`:

```typescript
import { createClient, type InferClient } from "@mercurjs/client"
import type { Routes } from '@mercurjs/core/_generated'

export const client: InferClient<Routes> = createClient({
    baseUrl: __BACKEND_URL__,
    fetchOptions: { credentials: 'include' }
})
```

The client uses recursive proxy + `qs` for query strings + FormData detection for uploads. Calls map: `.query()` → GET, `.mutate()` → POST, `.delete()` → DELETE.

**File upload pattern (vendor panel):**

The backend exposes `POST /vendor/uploads` (multer + `uploadFilesWorkflow`). Client call:

```typescript
const formData = new FormData()
formData.append('files', file)
const result = await client.vendor.uploads.mutate({
  fetchOptions: { body: formData }
})
```

The `@mercurjs/client` already detects `FormData` and strips `Content-Type` header so multipart boundary is set correctly. Do not use presigned S3 URLs at this layer — the Medusa file module abstraction handles the storage provider.

**Auth pattern (vendor panel):**

- Use MedusaJS `/auth/member/emailpass` for login — returns session cookie
- Credentials are stored in session cookie (`credentials: 'include'` on all requests)
- `react-jwt` is used for display-only (decode JWT to show member name) — not for auth verification
- Check auth state with `client.vendor.members.me.query()` on app load
- On 401: redirect to `/login`
- No localStorage token storage — cookie-based session only

### Infrastructure

| Technology | Version | Role |
|------------|---------|------|
| Docker Compose | v2 | 5 services: db, redis, api, vendor, storefront |
| PostgreSQL | **15** | Primary database |
| Redis | latest | Cache + BullMQ |
| Turborepo | **^2.7.4** | Monorepo task graph |
| Bun | **1.3.8** | Workspace package manager (`packageManager` field) |

---

## Package Versions (Exact Pins)

The following must be pinned **exact** (no `^`/`~`) because Mercur and MedusaJS share peer dependencies with strict compatibility requirements. The existing package.json files already pin these correctly — preserve the pins on any dependency update:

| Package | Exact Pin | Why |
|---------|-----------|-----|
| `@medusajs/ui` | `4.1.1` | Mercur dashboard-shared and admin/vendor all pin this exact version |
| `@tanstack/react-query` | `5.64.2` | `@mercurjs/client` depends on this exact minor |
| `@tanstack/react-table` | `8.20.5` | Shared across dashboard-shared/vendor/admin |
| `react-router-dom` | `6.30.3` | Mercur vendor routing built against this version |
| `react-hook-form` | `7.49.1` | Mercur form components built against this version |
| `zod` | `3.25.76` | Validators across core + vendor |
| `react-i18next` | `13.5.0` | i18n integration |
| `typescript` | `5.9.3` | All packages compiled with this version |
| `@hookform/resolvers` | `3.4.2` | Paired with RHF version |
| `radix-ui` | `1.1.2` | Umbrella package used in vendor/dashboard-shared |

**Bun version:** Keep at `1.3.8` (the `packageManager` field). Bun 1.3.13 mentioned in the project prompt is fine as a runtime upgrade but verify `bun install` still resolves workspace `*` deps correctly.

---

## What NOT to Use

### GraphQL layer on top of MedusaJS
**Avoid.** MedusaJS 2.x is REST-first. Adding Hasura, Apollo, or any GraphQL layer means duplicating type-safety that `@medusajs/js-sdk` and `@mercurjs/client` already provide. Extra infrastructure, extra maintenance surface, no benefit.

### Prisma on top of MedusaJS ORM
**Avoid.** MedusaJS 2.x uses MikroORM internally. Layering Prisma on top creates a second migration system and will conflict with Medusa's module-scoped data models. All custom models go through `defineModel()` from `@medusajs/framework/utils`.

### Raw fetch for vendor API calls
**Avoid.** `@mercurjs/client` provides full end-to-end type safety from the backend route types (`@mercurjs/core/_generated`). Raw fetch discards that safety and requires manual query-string serialization.

### `@medusajs/js-sdk` in the vendor panel
**Avoid.** The js-sdk is for store (B2C) API calls and the superadmin. The vendor panel authenticates as `member` actor type via `/vendor/*` routes, which the js-sdk does not cover. Use `@mercurjs/client` exclusively in `apps/vendor`.

### Zustand for vendor panel state
**Avoid at scale.** React Query already manages all async server state. Zustand would duplicate cache management for no gain. Only use React Context for the thin auth layer (current member identity).

### Next.js for vendor panel
**Avoid.** The vendor panel is intentionally a separate Vite SPA to isolate auth flows and build pipelines. Next.js would add SSR complexity the vendor panel does not need.

### `@mercurjs/core-plugin` npm package in this repo
**Avoid.** The repo uses `@mercurjs/core` as a workspace package (`packages/core`). The published npm package `@mercurjs/core-plugin` 2.0.2 is what external consumers install. Do not mix them — the template basic apps use the published one, this monorepo's apps use the workspace one.

### `localStorage` for auth tokens in vendor panel
**Avoid.** MedusaJS vendor auth is cookie-based session. `credentials: 'include'` on the client handles it. Storing tokens in localStorage creates XSS attack surface and breaks the existing auth middleware pattern.

### Upgrading TypeScript to 6.x without verification
**Avoid until confirmed.** All packages pin `typescript: 5.9.3`. TypeScript 6.x has breaking decorator and module resolution changes that may conflict with MedusaJS's internal compilation.

---

## Confidence Notes

| Area | Confidence | Basis |
|------|------------|-------|
| Core package versions (Medusa, Mercur) | HIGH | Direct inspection of all package.json files |
| State management recommendation (React Query) | HIGH | `@mercurjs/client` depends on it; existing hooks use it |
| API client pattern (`@mercurjs/client`) | HIGH | Code in `packages/client/src/index.ts` + `apps/vendor/src/lib/client.ts` |
| Auth pattern (cookie-based `member` session) | HIGH | Middleware source in `packages/core/src/api/vendor/middlewares.ts` |
| File upload pattern | HIGH | Backend route in `packages/core/src/api/vendor/uploads/route.ts` confirmed |
| Storefront API client (`@medusajs/js-sdk`) | HIGH | Code in `apps/storefront/src/lib/sdk.ts` + `client-sdk.ts` |
| TypeScript version freeze at 5.9.3 | HIGH | All package.json files pin exact same version |
| Exact pin list for Mercur packages | HIGH | Cross-referenced all package.json files |
| "What NOT to use" items | MEDIUM | Architecture analysis; some items (Prisma, GraphQL) based on known MedusaJS 2.x constraints |
| File storage backend (Medusa file module) | MEDIUM | Upload route uses `uploadFilesWorkflow` which is provider-agnostic; actual provider config not inspected |
| Bun 1.3.13 upgrade safety | LOW | No lockfile diff available; test before committing to it |
