---
slug: seed-seller-required-fields
status: complete
---

Added `email: "seller@bookshook.com"` and `currency_code: "usd"` to the
`createSellers` call in `apps/api/src/scripts/seed.ts`. Both fields are required
(not nullable, no default) on the Seller MikroORM entity. The email on line 635
was the member's email, not the seller's.
