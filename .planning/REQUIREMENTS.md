# Requirements — bookshook Marketplace (v1)

> Auto-generated from research synthesis. All table-stakes features included.

---

## v1 Requirements

### Infrastructure (INFRA)

- [ ] **INFRA-01**: All three Docker services (medusa, vendor, storefront) build and start from `docker compose up` without manual steps
- [ ] **INFRA-02**: Database migrations run automatically at container startup; zero manual migration steps
- [ ] **INFRA-03**: Seed script creates approved seller account, product categories (genres), shipping options per seller, and sample products so development can proceed immediately
- [ ] **INFRA-04**: CORS correctly configured across all four surfaces (storeCors, adminCors, vendorCors, authCors) as a matched set
- [ ] **INFRA-05**: Reverse proxy or cookie config resolves cross-origin `SameSite` issue so vendor auth works on localhost with separate ports

### Buyer Storefront (STORE)

- [ ] **STORE-01**: Buyer can browse all products with search by title, author, or ISBN and filter by genre/category, vendor, and price range
- [ ] **STORE-02**: Buyer can view a product detail page showing title, author, ISBN, condition, price, description, and seller name
- [ ] **STORE-03**: Buyer can add products from multiple vendors to a single cart and proceed through unified checkout
- [ ] **STORE-04**: Buyer can register and log in with email and password
- [ ] **STORE-05**: Buyer receives order confirmation after checkout with order ID and line item summary
- [ ] **STORE-06**: Logged-in buyer can view order history with status per order

### Vendor Panel (VENDOR)

- [ ] **VENDOR-01**: Seller can register an account, submit store details, and reach an "awaiting approval" state
- [ ] **VENDOR-02**: Approved seller can log in to the vendor panel and access their dashboard
- [ ] **VENDOR-03**: Seller can create, edit, and delete products with: title, author, ISBN, condition (new/used/like-new/acceptable), genre, description, price, stock quantity, and at least one image
- [ ] **VENDOR-04**: Seller can view the list of orders placed for their products, with buyer name, items, total, and current status
- [ ] **VENDOR-05**: Seller can mark an order as fulfilled (shipped)
- [ ] **VENDOR-06**: Seller can edit store settings: store name, description, and contact email

### Admin Panel (ADMIN)

- [ ] **ADMIN-01**: Superadmin can view a list of all sellers with status (pending/approved/rejected) and approve or reject a seller registration
- [ ] **ADMIN-02**: Superadmin can view and edit commission rates (global default and per-seller overrides)
- [ ] **ADMIN-03**: Superadmin can view all orders across the platform with seller and buyer attribution
- [ ] **ADMIN-04**: Superadmin can view all products across all sellers and remove or hide a product

---

## v2 Requirements (deferred)

- Wishlist (STORE) — low complexity, Phase 2
- Vendor storefront branding / banner (VENDOR) — low complexity, Phase 2
- Seller onboarding wizard UX polish (VENDOR) — medium, Phase 2
- Reviews and ratings with verified purchase check (STORE+VENDOR) — high, Phase 3
- Advanced vendor analytics (revenue charts, top products) — high, Phase 3
- Dispute resolution workflow — medium, Phase 3
- Stripe Connect payout activation — deferred pending credentials
- MeiliSearch upgrade (if Postgres FTS insufficient) — evaluate Phase 3

---

## Out of Scope

| Exclusion | Reason |
|-----------|--------|
| Payment processing (Stripe live) | Explicitly deferred; stub in place |
| Mobile apps | Web-only |
| Multi-language / RTL | Deferred; stubs exist for Hebrew |
| In-app messaging | Real-time infra + moderation complexity |
| Auction / bidding | Different commerce model |
| Subscription products | Recurring billing out of scope |
| AI recommendations | Cold-start + infra cost |
| Bulk CSV import | CRUD sufficient for v1 |

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| INFRA-05 | Phase 1 | Pending |
| VENDOR-01 | Phase 2 | Pending |
| VENDOR-02 | Phase 2 | Pending |
| VENDOR-03 | Phase 2 | Pending |
| VENDOR-04 | Phase 2 | Pending |
| VENDOR-05 | Phase 2 | Pending |
| VENDOR-06 | Phase 2 | Pending |
| ADMIN-01 | Phase 2 | Pending |
| STORE-01 | Phase 3 | Pending |
| STORE-02 | Phase 3 | Pending |
| STORE-03 | Phase 3 | Pending |
| STORE-04 | Phase 3 | Pending |
| STORE-05 | Phase 3 | Pending |
| STORE-06 | Phase 3 | Pending |
| ADMIN-02 | Phase 4 | Pending |
| ADMIN-03 | Phase 4 | Pending |
| ADMIN-04 | Phase 4 | Pending |
