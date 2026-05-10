# Architecture Research — Mercur.js Marketplace

**Project:** bookshook  
**Researched:** 2026-05-10  
**Sources:** Direct codebase analysis of `packages/core/src/`

---

## Component Boundaries

| Component | Port | Technology | Responsibility |
|-----------|------|------------|----------------|
| `apps/api` | 9000 | MedusaJS 2.13.6 + `@mercurjs/core` plugin | All API routes (`/admin/*`, `/store/*`, `/vendor/*`), auth, business logic, DB, queue |
| `apps/storefront` | 8000 | Next.js (App Router) | B2C shopping: product browse, cart, checkout, order history |
| `apps/vendor` | 7001 | React 18 + Vite | Vendor SPA: product CRUD, order mgmt, store settings, analytics |
| `packages/core` | — | TypeScript plugin | Mercur domain modules (seller, commission, payout), links, workflows, route handlers |
| `packages/vendor` | — | React | Vendor portal UI component library (consumed by `apps/vendor`) |
| `packages/dashboard-sdk` | — | Vite plugin | Build-time route generation + virtual modules for dashboard apps |

### Admin Panel Integration

The superadmin panel is **not** a separate app. It is served by the API server at `http://localhost:9000/dashboard`. The `AdminUIModuleService` extends `DashboardBase`, which:
- Detects serving mode at startup: `vite-proxy` (dev) → `static` (built) → `default-page` (not built)
- In dev, proxies to a separate Vite dev server on port 7000
- In production, serves the built `dist/` from the configured `appDir`

The same pattern applies to the vendor portal via `VendorUIModuleService`.

---

## Data Flow

### Multi-Vendor Order Flow (the critical path)

```
Buyer adds items to cart
        ↓
POST /store/carts/:id/complete
        ↓
completeCartWithSplitOrdersWorkflow
  1. acquireLockStep (idempotency)
  2. Query cart (all items with item.variant.product.seller.id)
  3. validateSellerCartItemsStep  — each item must have a seller
  4. validateSellerCartShippingStep — each seller must have a shipping method
  5. Group cart items by seller_id
  6. createOrdersStep → one Order per seller (OrderStatus.PENDING)
  7. createOrderGroupStep → one OrderGroup (aggregator, linked to cart)
  8. createRemoteLinkStep → creates:
       order → seller          (order_seller link)
       order_group → orders    (order_group_order link, table: order_group_order)
       order → payment_collection
       seller → customer       (if first purchase from that seller)
  9. reserveInventoryStep
  10. authorizePaymentSessionStep (single payment collection, split proportionally)
  11. addOrderTransactionStep — proportional amounts per order
  12. refreshOrderCommissionLinesWorkflow — calculates commission per line item
  13. emitEventStep (OrderWorkflowEvents.PLACED, OrderGroupWorkflowEvents.CREATED)
  14. releaseLockStep
```

**Key insight:** One cart → one payment → one `OrderGroup` → N `Order` records (one per seller). Payment is authorized once and split proportionally across orders. Commission lines are computed and stored immediately after order creation.

### Product → Seller Association

When a vendor creates a product via `/vendor/products`, `createProductsWorkflow` fires. A hook (`productsCreated`) reads `additional_data.seller_id` and:
1. Creates a `product_seller` remote link (ProductModule ↔ SellerModule)
2. Creates `inventory_item_seller` links for all managed variants

The storefront queries products via Medusa's standard `/store/products`. A middleware (`applySellerVisibilityFilter`) injects filters on `seller.status = OPEN` and checks `closed_from`/`closed_to` time windows before returning results.

To filter by a specific seller in the storefront, pass `seller_id` as a query param — the middleware translates it to a link filter via `product_seller`.

---

## Auth Architecture

### Two Distinct Auth Actors

| Actor | Type | Identifier | Used In |
|-------|------|------------|---------|
| `user` | Medusa admin user | Medusa's built-in user table | `/admin/*` routes |
| `member` | Vendor team member | `Member` model in SellerModule | `/vendor/*` routes |

### Vendor Auth Flow

Vendor routes use **Medusa's standard JWT/session auth** with `actor_type = "member"` — there is no separate JWT system. The flow:

1. Member authenticates via `/auth/member/emailpass` (Medusa auth provider)
2. Medusa issues a JWT/session token with `actor_type: "member"` and `actor_id: <member.id>`
3. Every `/vendor/*` request runs two middlewares in sequence:
   - `authenticate("member", ["session", "bearer"])` — validates JWT, populates `req.auth_context`
   - `ensureSellerMiddleware` — reads `x-seller-id` header (or `req.session.seller_id`), queries `seller_member` to confirm the member belongs to that seller, populates `req.seller_context`

### Seller Context Object

```typescript
req.seller_context = {
  seller_id: string,
  seller_member: SellerMember,   // with role_id
  currency_code: string,
}
```

If `sellerMember.role_id` is set, the RBAC module is invoked and the member's roles are injected into `req.auth_context.app_metadata.roles`.

### Member ↔ Seller Relationship

- `Member` is a standalone entity (like a Medusa user)
- One `Member` can belong to multiple `Seller` accounts (M:M via `SellerMember` pivot)
- The pivot stores `is_owner` and `role_id`
- `SellerMember.role_id` links to `RbacRole` via a remote link (read-only, not a DB FK)
- Unauthenticated vendor routes: `POST /vendor/sellers` (registration), `/vendor/sellers/select`, `/vendor/feature-flags`, `/vendor/stores`, `/vendor/members/invites/accept`

### Seller Status Lifecycle

`Seller.status` follows this enum path:
`PENDING_APPROVAL` → `OPEN` | `SUSPENDED` | `TERMINATED`

Workflows exist for each transition: `approveSeller`, `suspendSeller`, `terminateSeller`, `unsuspendSeller`, `unterminateSeller`. Admin triggers these via `/admin/sellers/:id/*` routes.

---

## Mercur Module Patterns

### MedusaJS Module Links (the core pattern)

Mercur does not modify Medusa's core tables. Instead it uses `defineLink()` to create join tables between Medusa modules and the `SellerModule`. All links are in `packages/core/src/links/`.

| Link | Join Table | Purpose |
|------|-----------|---------|
| `product_seller` | auto-generated | Product belongs to Seller (isList on product side) |
| `order_seller` | auto-generated | Order belongs to Seller |
| `order_group_order` | `order_group_order` | OrderGroup → Orders (1:N) |
| `order_group_cart` | auto-generated | OrderGroup ↔ Cart (1:1) |
| `inventory_item_seller` | auto-generated | InventoryItem belongs to Seller |
| `shipping_profile_seller` | auto-generated | ShippingProfile belongs to Seller |
| `shipping_option_seller` | auto-generated | ShippingOption belongs to Seller |
| `stock_location_seller` | auto-generated | StockLocation belongs to Seller |
| `seller_member_rbac_role` | (read-only) | SellerMember.role_id → RbacRole |
| `line_item_commission_line` | auto-generated | OrderLineItem → CommissionLine |
| `payout_seller` | auto-generated | Payout → Seller |
| `seller_customer` | auto-generated | Seller ↔ Customer (tracks buyer relationships) |

**Querying linked data:** Use Medusa's `query.graph()` with dot-notation fields. Example to get products with seller: `fields: ["id", "title", "seller.id", "seller.name", "seller.handle"]`.

### Custom Modules in SellerModule

The `SellerModule` (`packages/core/src/modules/seller`) owns:
- `Seller` — the vendor entity (status, name, handle, currency_code, etc.)
- `Member` — the human user for the vendor portal
- `SellerMember` — pivot with `role_id` and `is_owner`
- `MemberInvite` — token-based team invitations (JWT signed with `JWT_SECRET`)
- `OrderGroup` — aggregator entity (computed fields: `seller_count`, `total`)

### Commission Module

`CommissionModule` (`packages/core/src/modules/commission`) owns:
- `CommissionRate` — rate definition (percentage or flat, with `target`: ITEM or SHIPPING)
- `CommissionRule` — scoping rules (reference: `product`, `product_type`, `product_category`, `product_collection`, `seller`)
- `CommissionLine` — per-order-item calculated amount, linked to order line items

Commission calculation is rule-based with priority ordering. Higher priority rates win. A rate with no rules is the default/fallback. Calculated at checkout via `refreshOrderCommissionLinesWorkflow`, triggered inside `completeCartWithSplitOrdersWorkflow`.

### Admin Panel Extension Pattern

Admin panel extensions are **not** MedusaJS admin widgets injected into the core dashboard. Instead:
- `AdminUIModuleService` serves a completely separate React app (the `packages/admin` package) at `/dashboard` path on port 9000
- In dev: proxies to Vite dev server (default port 7000)
- In prod: serves the `dist/` build statically
- The `withMercur()` config wrapper sets `admin.disable: true` to suppress Medusa's own admin UI in favor of Mercur's custom one

### Vendor Portal Serving

`VendorUIModuleService` (same DashboardBase pattern) serves the vendor portal app. In this project, `apps/vendor` runs standalone on port 7001 (Vite dev server), and `VendorUIModuleService` proxies to it.

---

## Build Order (dependencies)

This is the strict dependency graph for implementation:

```
1. INFRA (Docker, DB, Redis, env) 
   — nothing works without this

2. Core module validation
   — Confirm @mercurjs/core plugin loads cleanly in medusa-config.ts
   — Run migrations: bun medusa db:migrate
   — Verify seller, commission, payout tables exist

3. Vendor Auth + Registration (VENDOR-01)
   — /vendor/sellers POST (unauthenticated, creates seller account)
   — /auth/member/emailpass (authenticate)
   — /vendor/sellers/select POST (pick active seller, sets seller_context)
   — Prerequisite for ALL other vendor routes

4. Product Management (VENDOR-02)
   — Depends on: vendor auth, seller context, product_seller link
   — /vendor/products CRUD
   — additional_data.seller_id must be passed on create

5. Storefront product display (STORE-01, STORE-03)
   — Depends on: products existing with seller links
   — /store/products?fields=seller.name,seller.handle
   — seller visibility filter middleware already in place

6. Cart + Checkout (STORE-02)
   — Depends on: products with sellers, shipping options per seller
   — completeCartWithSplitOrdersWorkflow handles the split
   — Each seller needs a ShippingProfile + ShippingOption before checkout works

7. Order Management (VENDOR-03, STORE-04)
   — Depends on: completed orders existing
   — /vendor/orders returns orders filtered by seller_id
   — /store/order-groups/:id for buyer order history

8. Admin: Vendor Management (ADMIN-01)
   — Depends on: sellers existing
   — approve/suspend/terminate workflows
   — /admin/sellers routes

9. Commission Management (ADMIN-02)
   — Depends on: orders existing with commission lines
   — /admin/commission-rates CRUD
   — Commission lines auto-computed at checkout

10. Store Settings + Analytics (VENDOR-04, VENDOR-05)
    — Depends on: orders, products, commission lines
    — Revenue = order subtotals; payout = subtotal minus commission

11. Platform Admin Oversight (ADMIN-03, ADMIN-04)
    — Depends on: all above
    — Order filtering: /admin/orders?seller_id=sel_xxx
    — Product filtering: /admin/products?seller_id=sel_xxx
```

---

## Integration Points

### Storefront → API

- Standard Medusa store API at `http://localhost:9000`
- CORS configured via `STORE_CORS=http://localhost:8000`
- Auth: customer session/JWT via `/auth/customer/*`
- Key non-standard endpoints:
  - `GET /store/sellers` — list sellers for vendor pages
  - `GET /store/sellers/:id` — seller detail/storefront
  - `GET /store/order-groups` — buyer order history (grouped)
  - `POST /store/carts/:id/complete` → `completeCartWithSplitOrdersWorkflow`
  - `GET /store/carts/:id/seller-shipping-options` — shipping options per seller in cart

### Vendor Panel → API

- All requests go to `http://localhost:9000/vendor/*`
- CORS: `VENDOR_CORS=http://localhost:7001`
- Every request must include `x-seller-id: <seller_id>` header (set after `/vendor/sellers/select`)
- Auth: `Authorization: Bearer <jwt>` or session cookie with `actor_type: member`

### Admin Panel → API

- All requests go to `http://localhost:9000/admin/*`
- CORS: `ADMIN_CORS=http://localhost:9000`
- Auth: Medusa admin user session/JWT with `actor_type: user`
- Mercur-added admin routes:
  - `/admin/sellers/*` — seller management (approve, suspend, etc.)
  - `/admin/commission-rates/*` — commission CRUD
  - `/admin/order-groups/*` — cross-vendor order views
  - `/admin/payouts/*` — payout records
  - `/admin/members/*` — vendor team members

### Webhook / Events

The event bus (Redis) carries:
- `SellerWorkflowEvents.CREATED` — on new seller registration
- `OrderWorkflowEvents.PLACED` — on checkout completion (per-order)
- `OrderGroupWorkflowEvents.CREATED` — on checkout (the group)
- `payout-webhook.ts` subscriber handles incoming payout provider webhooks

---

## Critical Implementation Notes

1. **`x-seller-id` header is mandatory.** Every vendor panel API call must include it. The vendor SPA should store the active `seller_id` in app state immediately after `/vendor/sellers/select` and attach it to every request via an Axios/fetch interceptor.

2. **Seller must be OPEN status to have products visible in storefront.** Products linked to PENDING_APPROVAL or SUSPENDED sellers are filtered out by middleware. Don't skip the approval workflow in dev without seeding approved sellers.

3. **Shipping options must be scoped per seller before checkout.** The `validateSellerCartShippingStep` will reject checkout if a seller in the cart has no matching shipping option. Each seller needs: ShippingProfile → FulfillmentSet → ServiceZone → ShippingOption, all linked to seller via remote links.

4. **Commission lines are computed at checkout, not at order creation.** If commission rates change after an order, `refreshOrderCommissionLinesWorkflow` can be re-run with order IDs. Commission rate priority: specific rule (product/seller/category) beats default (no rules).

5. **Admin panel is served by the API process, not as a separate service.** In Docker Compose, only one container is needed for the admin UI — the `api` service. The `apps/vendor` Vite app is a separate container on port 7001.

6. **`withMercur()` disables Medusa's built-in admin.** The `medusa-config.ts` must use `withMercur()` wrapper, which sets `admin.disable: true` and injects the `@mercurjs/core` plugin automatically. Do not call both `withMercur()` and manually configure `@mercurjs/core`.
