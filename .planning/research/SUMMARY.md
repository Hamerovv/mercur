# Research Summary — bookshook Marketplace

**Synthesized:** 2026-05-10  
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md + codebase inspection

---

## Stack Decision (final)

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Commerce engine | MedusaJS | 2.13.6 | Pin exact |
| Multi-vendor plugin | @mercurjs/core | 2.0.2 (workspace) | Workspace pkg, NOT npm |
| API runtime | Node.js | >=20 | — |
| Storefront | Next.js (App Router) | ^14.2.29 | RSC + revalidate pattern |
| Storefront API client | @medusajs/js-sdk | ^2.13.0 | Only in storefront |
| Vendor panel | React 18 + Vite | 18.3.1 / 5.4.21 | SPA, no SSR |
| Vendor API client | @mercurjs/client | 2.0.2 (workspace) | Only in vendor panel |
| Vendor UI library | @mercurjs/vendor | 2.0.2 (workspace) | Pre-built pages |
| Admin UI | @mercurjs/admin | 2.0.2 (workspace) | Served at /dashboard |
| Design system | @medusajs/ui | 4.1.1 | **Pin exact — no ^** |
| Server state | TanStack Query | 5.64.2 | **Pin exact** |
| Routing (vendor) | react-router-dom | 6.30.3 | **Pin exact** |
| Forms | react-hook-form | 7.49.1 | **Pin exact** |
| Validation | zod | 3.25.76 | **Pin exact** |
| TypeScript | — | 5.9.3 | **Pin exact — do not upgrade to 6.x** |
| Database | PostgreSQL | 15 | — |
| Cache/Queue | Redis | latest | BullMQ |
| Monorepo | Turborepo | ^2.7.4 | Stripped from Alpine Docker builds |
| Package manager | Bun | 1.3.8 | Workspace runner |
| Containers | Docker Compose v2 | — | 5 services |

**Hard rules:**
- `@mercurjs/client` in vendor panel only — NOT `@medusajs/js-sdk`
- `@medusajs/js-sdk` in storefront only — NOT in vendor panel
- No Prisma, no GraphQL, no Zustand, no localStorage auth tokens
- `withMercur()` in `medusa-config.ts` — never manually add `@mercurjs/core` to plugins

---

## What Already Exists

Mercur `packages/core` provides ~70% of backend table-stakes:

| Domain | What's provided |
|--------|----------------|
| Vendor registration | `seller-registration` module + `/vendor/sellers` POST route |
| Vendor auth | `member` actor type, `/auth/member/emailpass`, `ensureSellerMiddleware` |
| Order splitting | `completeCartWithSplitOrdersWorkflow` — one cart → N orders (one per seller) |
| Commission calculation | `commission` module, `refreshOrderCommissionLinesWorkflow` (runs at checkout) |
| Product→seller linking | `product_seller` remote link, `productsCreated` hook |
| Seller status lifecycle | `approveSeller`, `suspendSeller`, `terminateSeller` workflows |
| Admin routes | `/admin/sellers/*`, `/admin/commission-rates/*`, `/admin/order-groups/*`, `/admin/payouts/*` |
| Vendor routes | `/vendor/products`, `/vendor/orders`, `/vendor/members`, `/vendor/uploads` |
| Seller visibility filter | Middleware: only `status=OPEN` products visible in storefront |
| File upload | `POST /vendor/uploads` — multer + `uploadFilesWorkflow` |
| Payout stub | `payout-stripe-connect` package (not yet activated) |
| Vendor panel UI | `@mercurjs/vendor` pre-built pages (mount as `<App />` in main.tsx) |
| Admin panel UI | `packages/admin` (served by API process at /dashboard) |

**Existing app stubs:**
- `apps/api/src/` — 4 files (seed, middlewares, 2 empty routes)
- `apps/storefront/src/` — 12 files (product list, product detail, cart)
- `apps/vendor/src/` — 5 files (main, use-me hook, client, i18n, store-setup stub)

---

## What Must Be Built

### API (`apps/api`)

| Work item | What |
|-----------|------|
| `medusa-config.ts` hardening | CORS for all 4 surfaces, DB pool config, admin-ui enable flags |
| Seed script | Genre categories, admin user, 1+ approved seller, shipping options per seller |
| Book metadata fields | ISBN, author, condition (new/used/like-new) as custom product fields |
| Shipping setup | ShippingProfile + FulfillmentSet + ServiceZone + ShippingOption linked per seller |
| Migration verification | Fresh-DB run confirming all Mercur link tables created in correct order |
| File storage config | Local disk (dev) → S3 driver config (prod) |

### Storefront (`apps/storefront`)

| Work item | Depends on |
|-----------|-----------|
| STORE-01: Product browse, search (title/author/ISBN), filter by genre/vendor/price | API products with seller links |
| STORE-02: Multi-vendor cart + unified checkout | Products with sellers + shipping options per seller |
| STORE-03: Product detail page with vendor info and book condition | STORE-01 |
| STORE-04: Order confirmation + order history via `/store/order-groups` | STORE-02 complete |
| Buyer auth (register/login/session) | Medusa customer auth |
| Vendor storefront page (`/store/sellers/:id`) | Sellers with OPEN status |

### Vendor Panel (`apps/vendor`)

| Work item | Depends on |
|-----------|-----------|
| VENDOR-01: Auth flow (login, registration, seller-select) | INFRA-01 CORS + cookie config |
| VENDOR-02: Product CRUD + image upload + ISBN/author/condition fields | VENDOR-01, file storage driver |
| VENDOR-03: Order list (vendor-scoped) + mark-fulfilled | VENDOR-01, orders existing |
| VENDOR-04: Store settings (profile, banner, bio, payout info placeholder) | VENDOR-01 |
| VENDOR-05: Analytics dashboard (revenue, orders, top products) | VENDOR-03 |

### Admin Panel

| Work item | Depends on |
|-----------|-----------|
| ADMIN-01: Vendor approval/rejection UI, seller list + detail | Sellers existing |
| ADMIN-02: Commission rate CRUD (global + per seller/category) | Orders existing |
| ADMIN-03: Platform-wide order oversight with seller filter | Orders existing |
| ADMIN-04: Product moderation | Products existing |
| Enable both admin disable flags in `medusa-config.ts` | INFRA-01 |

---

## Critical Constraints

1. **Seller must be OPEN before products appear in storefront.** Seed at least one approved seller or the storefront shows nothing.

2. **Every seller needs shipping options before checkout.** `validateSellerCartShippingStep` rejects checkout if any seller in the cart has no shipping option. Each seller needs: `ShippingProfile → FulfillmentSet → ServiceZone → ShippingOption`, all linked via remote links. Seed this or checkout is permanently broken.

3. **`x-seller-id` header is mandatory on every vendor API call.** Set after `/vendor/sellers/select`, store in app state, attach to all requests. Missing it gives 401 on every vendor endpoint.

4. **Four CORS surfaces must be configured as a matched set.** `STORE_CORS`, `ADMIN_CORS`, `VENDOR_CORS`, `AUTH_CORS`. `AUTH_CORS` must include ALL three app origins. Missing any one causes silent 401/403 that looks like an auth bug.

5. **Cookie auth cross-origin requires SameSite fix.** Vendor panel (port 7001) and API (port 9000) are cross-origin. Current `SameSite=Lax` + `credentials: include` is browser-dependent and breaks on staging. Fix before VENDOR-01.

6. **`withMercur()` auto-injects `@mercurjs/core` — never add it manually.** Double registration crashes startup with no clear error message.

7. **Commission lines require product→seller link hydrated at checkout.** If `product_seller` link is missing, seller-specific commission rates are silently skipped; only global default applies. Wire link at VENDOR-02, add integration test.

---

## Build Order

```
INFRA-01: Docker clean build + CORS config + cookie fix + DB pool + admin flags
  └─ INFRA-02: Fresh migration run, verify all link tables exist
       └─ INFRA-03: Seed (admin user, genre categories, 1+ approved seller, shipping options)
            ├─ VENDOR-01: Vendor auth (login, registration, seller-select)
            │    ├─ VENDOR-02: Product CRUD + image upload + book metadata
            │    │    └─ STORE-01: Product browse + search + filters
            │    │         ├─ STORE-03: Product detail + vendor page
            │    │         └─ STORE-02: Cart + checkout (needs seeded shipping options)
            │    │              ├─ STORE-04: Order confirmation + order history
            │    │              ├─ VENDOR-03: Order mgmt + fulfillment
            │    │              ├─ ADMIN-03: Platform order oversight
            │    │              └─ ADMIN-02: Commission management
            │    └─ ADMIN-04: Product moderation
            └─ ADMIN-01: Vendor approval/rejection
                 └─ VENDOR-04: Store settings
                      └─ VENDOR-05: Analytics
```

**Parallelizable after INFRA-03 + VENDOR-01:** STORE-01/03 and ADMIN-01/04 can run in parallel with VENDOR-02/03.

---

## Pitfalls — P0/P1 (fix before feature work)

| Priority | ID | Problem | Fix |
|----------|-----|---------|-----|
| P0 | CRIT-D1 | Turbo binary fails on Alpine — builds silently broken | Keep `jq` strip of `turbo` + `packageManager` in all Dockerfiles |
| P0 | CRIT-M1 | CORS four surfaces — one wrong origin blocks all API calls | All four env vars as matched set; AUTH_CORS includes all three origins |
| P0 | CRIT-V1 | Cookie SameSite/Lax cross-origin — vendor auth silently fails | Reverse proxy for local dev; `SameSite=None; Secure` for staging |
| P1 | CRIT-D2 | NEXT_PUBLIC_* baked at build time — wrong URL in browser after deploy | Pass correct `--build-arg NEXT_PUBLIC_MEDUSA_BACKEND_URL` at image build |
| P1 | CRIT-M2 | Admin double `disable` flag — Mercur widgets don't appear | Both `admin: { disable: false }` AND `admin-ui module options.disable: false` |
| P1 | CRIT-R2 | `packages/core` build `|| true` — real errors swallowed | Fix TS18046 upstream; track as tech debt |
| P1 | CRIT-V2 | Commission zero-amount — product→seller link not hydrated at checkout | Create `product_seller` link at product creation; add integration test |

---

## Phase Recommendations

### Phase 1 — Foundation (INFRA-01, INFRA-02, INFRA-03)
All three apps build, start, and communicate. One full checkout works with seeded data.

Includes all P0/P1 pitfall fixes, CORS config, DB pool, admin flags, migration verification, seed script with approved seller + genre categories + shipping options.

Rationale: Without working infra, every subsequent phase hits intermittent failures. The shipping-options seed requirement is easy to miss and catastrophically blocks checkout — fix it once here.

Research flag: None needed — standard Docker/MedusaJS patterns.

### Phase 2 — Vendor Workflow (VENDOR-01, VENDOR-02, VENDOR-03, ADMIN-01)
A vendor can register, get approved, list books, and fulfill orders.

Includes vendor auth + onboarding, product CRUD with ISBN/author/condition fields, image upload with `product_seller` link enforcement, order view + fulfillment, seller approval/rejection.

Rationale: Vendor content gates the storefront — no approved sellers means nothing to show buyers. ADMIN-01 included here because seller approval unblocks STORE-01.

Research flag: File storage driver (local vs S3) must be decided before image upload work. May need research phase if S3 Medusa module config is unclear.

### Phase 3 — Buyer Storefront (STORE-01, STORE-02, STORE-03, STORE-04)
A buyer can find books, cart, checkout, and view orders.

Includes product browse/search/filter (ISBN, author, genre, vendor), product detail + vendor page, multi-vendor cart + unified checkout, order confirmation + order history.

Rationale: Storefront depends on Phase 2 products and Phase 1 shipping options. STORE-02 is highest risk — validate `completeCartWithSplitOrdersWorkflow` end-to-end early in this phase.

Research flag: Search driver decision needed before STORE-01. Postgres full-text vs MeiliSearch — resolve at phase planning.

### Phase 4 — Platform Admin + Ops (ADMIN-02, ADMIN-03, ADMIN-04, VENDOR-04, VENDOR-05)
Platform is operationally manageable.

Includes commission rate CRUD, platform order oversight, product moderation, vendor store settings/branding, basic analytics.

Rationale: Commission and moderation tooling is not needed for first transactions but required before real vendor onboarding. Analytics depends on Phase 3 order data.

Research flag: None — commission module is pre-built; UI is CRUD wiring.

### Phase 5 — Book-Specific Polish (differentiators)
Wishlist, seller onboarding wizard, reviews/ratings (high complexity — defer to later milestone), genre taxonomy refinement, vendor branding.

Research flag: Reviews/ratings — no Mercur built-in; needs custom module. Flag for research at Phase 5 planning.

---

## Open Decisions

| Decision | Needed by | Options |
|----------|-----------|---------|
| File storage driver | VENDOR-02 | Local disk (dev) / AWS S3 (`@medusajs/file-s3`) / Cloudflare R2 |
| Search driver | STORE-01 | Postgres full-text (no extra infra) vs MeiliSearch (better relevance, extra service) |
| Local dev reverse proxy | VENDOR-01 | nginx/Caddy to solve SameSite cross-origin cookie issue |
| Stripe Connect activation | Post-MVP | Payout stub exists; do not block MVP |

---

## Confidence

| Area | Confidence | Basis |
|------|-----------|-------|
| Stack versions + exact pins | HIGH | Direct package.json inspection |
| Mercur module coverage | HIGH | Source code analysis of packages/core |
| Auth architecture | HIGH | Middleware source inspected |
| Checkout order-split flow | HIGH | Full workflow traced step-by-step |
| CORS + cookie pitfalls | HIGH | Live config files analyzed |
| Docker pitfalls | HIGH | Both Dockerfiles inspected |
| Commission zero-amount bug | HIGH | commission/service.ts optional chaining confirmed |
| File storage backend | MEDIUM | Upload route confirmed; storage provider config not traced |
| Search implementation | MEDIUM | No driver configured; decision pending |
| Stripe Connect activation | LOW | Stub exists; activation path not documented |
