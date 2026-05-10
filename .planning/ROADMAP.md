# ROADMAP — bookshook Marketplace

**Project:** bookshook — Mercur.js multi-vendor book marketplace  
**Milestone:** v1 MVP  
**Granularity:** Standard  
**Created:** 2026-05-10  
**Coverage:** 20/20 requirements mapped

---

## Phases

- [ ] **Phase 1: Foundation** — All three Docker services start and communicate; DB migrations run; seed data creates usable dev state; CORS and cookie auth resolved
- [ ] **Phase 2: Vendor Workflow** — A seller can register, get approved by admin, log in to vendor panel, manage book products, fulfill orders, manage store settings, and view analytics
- [ ] **Phase 3: Buyer Storefront** — A buyer can browse, search, filter, and purchase books from multiple vendors and view order history
- [ ] **Phase 4: Platform Admin & Ops** — Superadmin can manage commissions, oversee all orders, and moderate products platform-wide

---

## Phase Details

### Phase 1: Foundation
**Goal**: All three Docker services (medusa, vendor, storefront) build, start, and communicate; database migrations run automatically; seed data provides an approved seller with shipping options and genre categories so all subsequent development can proceed without manual setup.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. Running `docker compose up` from a clean state starts all five services (db, redis, medusa, vendor, storefront) without any manual intervention or error
  2. The medusa API responds at `http://localhost:9000/health` and the storefront loads at `http://localhost:8000` within 60 seconds of startup
  3. A developer can log in to the superadmin panel at `http://localhost:9000/dashboard` with the seeded admin credentials immediately after first startup
  4. The seed script creates at least one approved seller with shipping options and book genre categories so the storefront is not empty
  5. Vendor panel login at `http://localhost:7001` succeeds for the seeded seller without cross-origin cookie errors
**Plans**: TBD
**Technical notes**:
  - Fix CRIT-D1: Strip `turbo` binary from Alpine Dockerfiles using `jq` — silently breaks builds otherwise
  - Fix CRIT-M1: Set all four CORS env vars as a matched set; `AUTH_CORS` must include all three app origins (8000, 7001, 9000)
  - Fix CRIT-V1: Add nginx/Caddy reverse proxy or set `SameSite=None; Secure` to resolve cross-origin cookie issue between vendor (7001) and API (9000)
  - Fix CRIT-M2: Set both admin disable flags (`admin: { disable: false }` AND `admin-ui module options.disable: false`) in `medusa-config.ts`
  - Seed must include: `ShippingProfile → FulfillmentSet → ServiceZone → ShippingOption` per seller — missing this permanently blocks checkout
  - Use `withMercur()` in `medusa-config.ts` — never manually add `@mercurjs/core` to plugins (crashes with double registration)

---

### Phase 2: Vendor Workflow
**Goal**: A seller can register an account, be approved by a superadmin, log in to the vendor panel, create and manage book products with book-specific fields, view and fulfill orders, manage store settings, and view basic analytics.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: VENDOR-01, VENDOR-02, VENDOR-03, VENDOR-04, VENDOR-05, VENDOR-06, ADMIN-01
**Success Criteria** (what must be TRUE):
  1. A new seller can submit a registration form with store details and see an "awaiting approval" confirmation screen
  2. A superadmin can view the pending seller in the admin panel and click Approve; the seller can then log in to the vendor panel immediately after approval
  3. An approved seller can create a product listing with title, author, ISBN, condition (new/used/like-new/acceptable), genre, description, price, stock quantity, and at least one uploaded image
  4. A seller can view the list of orders for their products with buyer name, line items, total, and status, and mark an order as fulfilled
  5. A seller can edit store settings (name, description, contact email) and view a basic analytics dashboard showing revenue, order count, and top products
**Plans**: TBD
**Technical notes**:
  - `x-seller-id` header is mandatory on every vendor API call — set it after `/vendor/sellers/select` and attach to all subsequent requests
  - Fix CRIT-V2: Create `product_seller` remote link at product creation to prevent zero-amount commission bug at checkout
  - File storage driver decision required before VENDOR-03 image upload: local disk (dev) is sufficient for v1; wire `@medusajs/file-local` config
  - Vendor auth uses `member` actor type via `/auth/member/emailpass` — NOT the same as customer auth; `@mercurjs/client` only in vendor panel
  - `@mercurjs/vendor` pre-built pages mount as `<App />` in `main.tsx` — do not reimplement pages already provided
  - ADMIN-01 included here because seller approval unblocks Phase 3 storefront testing end-to-end
  - VENDOR-05 analytics depends on order data; seed orders or defer analytics to after Phase 3 if no orders exist in dev
**UI hint**: yes

---

### Phase 3: Buyer Storefront
**Goal**: A buyer can browse and search for books across all vendors, view product details with vendor info, add items from multiple vendors to a single cart, complete checkout, receive an order confirmation, and view order history.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: STORE-01, STORE-02, STORE-03, STORE-04, STORE-05, STORE-06
**Success Criteria** (what must be TRUE):
  1. A buyer can search for books by title, author, or ISBN and filter results by genre, vendor, and price range; only products from approved sellers with OPEN status appear
  2. A buyer can view a product detail page showing title, author, ISBN, condition, price, description, and the seller's store name
  3. A buyer can add books from two different vendors to the same cart and complete a single unified checkout flow that splits into per-vendor orders
  4. A buyer can register and log in with email and password, and their session persists across page reloads
  5. After checkout, the buyer sees an order confirmation with order ID and line-item summary; logged-in buyers can view all past orders with their current status
**Plans**: TBD
**Technical notes**:
  - STORE-02 is highest risk — validate `completeCartWithSplitOrdersWorkflow` end-to-end early; requires Phase 1 shipping options seeded per seller
  - Use `@medusajs/js-sdk` in storefront only — never `@mercurjs/client`; buyer auth uses customer actor type
  - Search: use Postgres full-text for v1 (no extra infra); MeiliSearch deferred to v2 if relevance is insufficient
  - Use `/store/order-groups` endpoint for multi-vendor order history view
  - Seller visibility filter already enforced by Mercur middleware — only `status=OPEN` products appear; no custom filtering needed
  - Next.js App Router: use RSC + `revalidate` pattern; `NEXT_PUBLIC_MEDUSA_BACKEND_URL` must be passed as `--build-arg` at image build (baked at compile time)
**UI hint**: yes

---

### Phase 4: Platform Admin & Ops
**Goal**: Superadmin can manage commission rates, oversee all platform orders with seller attribution, and moderate products platform-wide.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: ADMIN-02, ADMIN-03, ADMIN-04
**Success Criteria** (what must be TRUE):
  1. A superadmin can view all orders across the platform filtered by seller or buyer with seller and buyer attribution on each order
  2. A superadmin can view and edit the global commission rate and set a per-seller override; commission changes apply to subsequent orders
  3. A superadmin can view all products across all sellers and remove or hide a product that violates platform policies
**Plans**: TBD
**Technical notes**:
  - Commission module and admin routes (`/admin/commission-rates/*`) are pre-built in `@mercurjs/core` — this phase is UI wiring only
  - `/admin/order-groups/*` endpoint provides platform-wide order view with seller attribution
  - Product moderation via `/admin/products` with status toggle — no new backend work required
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/? | Not started | — |
| 2. Vendor Workflow | 0/? | Not started | — |
| 3. Buyer Storefront | 0/? | Not started | — |
| 4. Platform Admin & Ops | 0/? | Not started | — |
