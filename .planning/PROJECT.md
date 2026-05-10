# bookshook — Multi-Vendor Marketplace

## What This Is

A multi-vendor book marketplace built on Mercur.js 2.0 (MedusaJS 2.13.6). Three applications run together under Docker:

1. **Storefront** (port 8000) — Next.js B2C shopping experience for buyers
2. **Vendor Panel** (port 7001) — React/Vite dashboard for sellers to manage products, orders, payouts
3. **Superadmin Panel** (port 9000/dashboard) — MedusaJS admin extended with Mercur vendor-management widgets

## Core Value

Buyers can discover and purchase books from multiple independent vendors in a single checkout flow, while vendors self-manage their catalogues and orders, and a superadmin controls the platform.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | MedusaJS 2.13.6 + `@mercurjs/core` |
| Storefront | Next.js (App Router) |
| Vendor Panel | React 18 + Vite |
| Monorepo | Turborepo + Bun 1.3.8 |
| Database | PostgreSQL 15 |
| Cache/Queue | Redis |
| Container | Docker Compose (5 services) |
| Language | TypeScript throughout |

## Environment

```
DATABASE_URL=postgres://hadas:Sifrut10@db:5432/bookshook_mercur
REDIS_URL=redis://redis:6379
JWT_SECRET=JWT-Hadas-Secret
COOKIE_SECRET=COOKIE-LOCAL-SECRET
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:9000
VENDOR_CORS=http://localhost:7001
AUTH_CORS=http://localhost:9000,http://localhost:7001,http://localhost:8000
NODE_ENV=staging
```

## Existing Code

The skeleton is in place but apps are sparse stubs:
- `apps/api/src/` — 4 files: seed, middlewares, 2 empty custom routes
- `apps/storefront/src/` — 12 files: product list, product detail, cart
- `apps/vendor/src/` — 5 files: main, use-me hook, client, i18n, store-setup stub
- `packages/core/` — full Mercur core library (modules, workflows, policies)

## Requirements

### Validated

- ✓ Docker Compose with postgres, redis, medusa, vendor, storefront — existing
- ✓ Bun monorepo with Turborepo — existing
- ✓ Mercur.js 2.0 core modules (vendor, commission, seller-registration) — existing in packages/core
- ✓ Basic storefront (product list + cart) — existing stub

### Active

- [ ] STORE-01: Full storefront with product browsing, search, filtering by vendor/category
- [ ] STORE-02: Multi-vendor cart and unified checkout
- [ ] STORE-03: Product detail pages with vendor info
- [ ] STORE-04: Order confirmation and order history
- [ ] VENDOR-01: Vendor authentication and onboarding (seller registration flow)
- [ ] VENDOR-02: Product management (CRUD, images, inventory)
- [ ] VENDOR-03: Order management (view, fulfill, status updates)
- [ ] VENDOR-04: Store settings (profile, branding, payout info)
- [ ] VENDOR-05: Basic analytics dashboard (revenue, orders, top products)
- [ ] ADMIN-01: Superadmin vendor management (approve/reject sellers, view stores)
- [ ] ADMIN-02: Commission management (set rates per vendor or global)
- [ ] ADMIN-03: Platform-wide order oversight
- [ ] ADMIN-04: Product moderation
- [ ] INFRA-01: All three Docker services build and start cleanly
- [ ] INFRA-02: Database migrations run automatically on startup
- [ ] INFRA-03: Seed data for development

### Out of Scope

- Payment processing (Stripe) — future phase
- Mobile apps — web only
- Multi-language / RTL (Hebrew) — future polish phase (stubs exist)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Mercur.js 2.0 core | Vendor/commission modules pre-built | — Pending validation |
| Vendor panel as separate Vite SPA | Isolation, distinct auth flow | — Pending |
| Superadmin via MedusaJS /dashboard | Zero extra infra, Medusa RBAC | — Pending |
| Docker Compose for all services | Dev parity, single command startup | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-10 after initialization*
