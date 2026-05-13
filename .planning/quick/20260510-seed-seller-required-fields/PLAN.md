---
slug: seed-seller-required-fields
date: 2026-05-10
status: in-progress
---

# Fix seed.ts seller creation missing required fields

## Problem
`createSellers` call at line 626 omits `email` and `currency_code` fields.
Seller MikroORM entity requires both (not nullable, no default).
`email` on line 635 is the *member's* email, not the seller's.

## Fix
Add to createSellers call:
- `email: "seller@bookshook.com"`
- `currency_code: "usd"`

## File
`apps/api/src/scripts/seed.ts` lines 626-631
