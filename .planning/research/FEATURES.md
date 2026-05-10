# Features Research — Multi-Vendor Marketplace

## Key Finding

Mercur.js `packages/core` already covers ~70% of table-stakes backend: vendor registration, order splitting, commission calculation, payout provider interface — build effort is mostly UI wiring.

---

## Table Stakes Features

### Buyer (Storefront)

| Feature | Complexity | App | Dependencies |
|---------|------------|-----|--------------|
| Product listing / browse | Low | Storefront | API product catalog |
| Search (title, author, ISBN) | Medium | Storefront | MedusaJS search + book metadata |
| Filter by category / vendor / price | Medium | Storefront | Product listing, vendor linkage |
| Product detail page | Low | Storefront | Vendor profile |
| Multi-vendor cart | Medium | Storefront | Checkout, Mercur order splitting |
| Unified checkout | **High** | Storefront | Cart, Mercur workflow, order splitting |
| Guest checkout | Medium | Storefront | Checkout |
| Order confirmation | Low | Storefront | Checkout |
| Order history / tracking | Medium | Storefront | Buyer auth, orders |
| Buyer auth (register/login) | Low | Storefront | MedusaJS customer auth |
| Vendor storefront page | Low | Storefront | Vendor profile data |

### Vendor (Vendor Panel)

| Feature | Complexity | App | Dependencies |
|---------|------------|-----|--------------|
| Vendor registration / onboarding | Medium | Vendor | Mercur seller-registration module, admin approval |
| Vendor login / auth | Low | Vendor | Mercur vendor auth |
| Product CRUD | Medium | Vendor | Image upload |
| Image upload | Medium | Vendor | File storage driver |
| Inventory management | Low | Vendor | Product CRUD |
| Order list / view (vendor-scoped) | Low | Vendor | Platform orders |
| Order fulfillment (mark shipped) | Low | Vendor | Order view |
| Store settings (profile, payout info) | Medium | Vendor | File upload |
| Basic analytics dashboard | Medium | Vendor | Orders, products |

### Platform Admin

| Feature | Complexity | App | Dependencies |
|---------|------------|-----|--------------|
| Vendor approval / rejection | Low | Admin | Mercur admin widget |
| Vendor list + detail | Low | Admin | — |
| Commission management | Medium | Admin | Mercur commission module |
| Platform-wide order oversight | Low | Admin | — |
| Product moderation | Medium | Admin | Product catalog |
| User (buyer) management | Low | Admin | MedusaJS built-in |
| Payout oversight | Medium | Admin | Commission, Stripe Connect |

---

## Differentiators (prioritized by phase)

| Feature | Complexity | Phase |
|---------|------------|-------|
| Book condition labels (new/used/like-new) | Low | Phase 1 |
| ISBN + author as first-class product fields | Low | Phase 1 |
| Genre taxonomy (pre-seeded categories) | Low | Phase 1 |
| Vendor storefront branding (banner, bio) | Low | Phase 2 |
| Wishlist | Low | Phase 2 |
| Seller onboarding wizard | Medium | Phase 2 |
| Reviews and ratings (verified purchase) | High | Phase 3 |
| Advanced vendor analytics | High | Phase 3 |
| Loyalty / points | High | Phase 4+ |
| Bundles | High | Phase 4+ |

---

## Anti-Features (v1 exclusions)

| Anti-Feature | Reason |
|--------------|--------|
| In-app messaging | Real-time infra + moderation burden |
| Auction / bidding | Different commerce model |
| Subscription products | Recurring billing complexity |
| Payment processing (Stripe) | Explicitly deferred in PROJECT.md |
| Flash sales / coupons | Medusa multi-vendor discount engine non-trivial |
| AI recommendations | Cold-start problem, infra cost |
| Bulk CSV import | Manual CRUD sufficient for MVP |
| Mobile apps | Web-only per PROJECT.md |
| Multi-language / RTL | Deferred per PROJECT.md |

---

## Feature Dependency Map

```
Vendor Registration → Admin Approval → Vendor Login
  → Product CRUD → Image Upload
                 → Inventory Management
  → Store Settings (payout)
  → Order View → Order Fulfillment

Product Catalog (seeded categories)
  → Product Listing → Search + Filters
                    → Product Detail → Vendor Storefront Page
  → Product Moderation (admin)

Buyer Auth
  → Multi-Vendor Cart → Unified Checkout
      → Order Confirmation
      → Order Splitting [Mercur workflow]
          → Vendor Order View
          → Commission Calculation [Mercur module]
          → Platform Order Oversight
  → Order History / Tracking

Commission Management → Payout Oversight → Stripe Connect (future)
```

---

## Mercur.js Module Coverage

| Feature | Mercur Coverage | Remaining Effort |
|---------|----------------|-----------------|
| Vendor registration + approval | `seller-registration` module | Wire UI only |
| Commission calculation | `commission` module | Configure rates in admin |
| Order splitting per vendor | Core workflow | Wire checkout flow |
| Vendor auth | Mercur vendor auth | Configure CORS + JWT |
| Payout provider | `payout-stripe-connect` | Activate in future phase |
| Product scoped to vendor | MedusaJS + Mercur links | Wire UI filters |
| Admin vendor widgets | `packages/admin` extension | Register in superadmin |

---

## Open Questions

- **File storage**: local disk for dev, S3 for prod — confirm driver before VENDOR-02
- **Search**: confirm Postgres full-text search is sufficient for ISBN/author/title or if MeiliSearch needed
- **Stripe Connect**: payout stub exists but activation timeline unclear
