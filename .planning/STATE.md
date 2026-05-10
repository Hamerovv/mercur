# STATE — bookshook Marketplace

> Project memory. Updated at phase transitions and plan completions.

---

## Project Reference

**Core value**: Buyers can discover and purchase books from multiple independent vendors in a single checkout flow, while vendors self-manage their catalogues and orders, and a superadmin controls the platform.

**Current milestone**: v1 MVP  
**Current focus**: Phase 1 — Foundation

---

## Current Position

| Field | Value |
|-------|-------|
| Phase | 1 — Foundation |
| Plan | Not started |
| Status | Not started |
| Phase goal | All three Docker services start and communicate; DB migrations run; seed data creates usable dev state; CORS and cookie auth resolved |

**Progress bar**: Phase 1 [ ] → Phase 2 [ ] → Phase 3 [ ] → Phase 4 [ ]

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 4 |
| Phases complete | 0 |
| Requirements total | 20 |
| Requirements complete | 0 |
| Plans created | 0 |
| Plans complete | 0 |

---

## Accumulated Context

### Key Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Use Mercur.js 2.0 core (`withMercur()`) | Vendor/commission/order-split modules pre-built; manual plugin add causes crash | 1 |
| Vendor panel as separate Vite SPA | Isolation, distinct auth flow (`member` actor type) | 2 |
| Superadmin via MedusaJS /dashboard | Zero extra infra, Mercur admin UI pre-built | 1 |
| Docker Compose for all services | Dev parity, single command startup | 1 |
| Postgres full-text search for v1 | No extra infra; MeiliSearch deferred to v2 | 3 |
| Local disk file storage for v1 | No credentials needed; S3 deferred to post-MVP | 2 |

### Critical Constraints (carry forward)

- CORS four surfaces must be set as a matched set; `AUTH_CORS` includes all three origins
- Every seller needs `ShippingProfile → FulfillmentSet → ServiceZone → ShippingOption` before checkout works
- `x-seller-id` header required on every vendor panel API call
- `product_seller` remote link must be created at product creation to prevent zero-amount commission
- TypeScript pinned at 5.9.3 — do NOT upgrade to 6.x
- `@mercurjs/client` in vendor panel only; `@medusajs/js-sdk` in storefront only
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL` baked at Next.js build time — pass as `--build-arg`
- Turbo binary stripped from Alpine Docker builds (jq filter in Dockerfile)

### Open Decisions

| Decision | Needed by | Options |
|----------|-----------|---------|
| Local dev reverse proxy tool | Phase 1 | nginx vs Caddy to fix SameSite cross-origin |
| S3 storage provider | Post-MVP | `@medusajs/file-s3` vs Cloudflare R2 |
| Stripe Connect activation | Post-MVP | Payout stub exists; do not block MVP |
| MeiliSearch upgrade | v2 | Evaluate after Phase 3 if Postgres FTS insufficient |

### Blockers

None at project start.

### Technical Debt

| Item | Phase created | Notes |
|------|---------------|-------|
| `packages/core` build `|| true` swallows real TS errors | Pre-existing | CRIT-R2; fix TS18046 upstream when stable |

---

## Session Continuity

**Last session**: 2026-05-10 — Project initialized; roadmap created  
**Next action**: Run `/gsd-plan-phase 1` to create Phase 1 execution plan  
**Context to carry**: All critical constraints above apply to Phase 1 work; pitfall list from research/SUMMARY.md is the priority order for Phase 1

---

## Phase Transition Log

| Date | From | To | Notes |
|------|------|----|-------|
| 2026-05-10 | — | Phase 1 | Project initialized |
