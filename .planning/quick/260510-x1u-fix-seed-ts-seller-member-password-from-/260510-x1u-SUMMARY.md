---
phase: quick-260510-x1u
plan: "01"
status: complete
subsystem: seed
tags: [seed, password, auth]
key_files:
  modified:
    - apps/api/src/scripts/seed.ts
---

# Quick Task 260510-x1u: Fix seed.ts seller password

**One-liner:** Changed seeded seller member password from "Seller123!" to "Vendor123!" to match vendor panel login credentials.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Change seeded password from Seller123! to Vendor123! | `fe849ea0` | `apps/api/src/scripts/seed.ts` |

## Root cause context

Identified via /gsd-debug: the DB had a provider_identity for seller@bookshook.com with password hash for "Seller123!" but the vendor panel login was attempted with "Vendor123!". The seed also had a stale Docker cache issue (seed.js compiled with old crypto.scrypt — fixed by rebuilding with --no-cache).
