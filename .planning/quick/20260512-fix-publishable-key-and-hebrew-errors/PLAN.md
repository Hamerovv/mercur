---
slug: fix-publishable-key-and-hebrew-errors
date: 2026-05-12
status: complete
---

# Fix: Publishable Key + Hebrew Error Messages

## Problem
1. `/store/customers/me` returning 400 "A valid publishable key is required" — hardcoded key in SDK files did not match DB key
2. Raw English API error messages leaking to UI via `err?.message`

## Changes
- `apps/storefront/src/lib/client-sdk.ts` — correct publishable key fallback
- `apps/storefront/src/lib/sdk.ts` — correct publishable key fallback
- `apps/storefront/src/app/register/page.tsx` — map errors to Hebrew
- `docker-compose.yml` — correct build arg / env var fallback key

## Root Cause
DB publishable key was `pk_80ab1b8186df06e8f80c427f2c76e150fb00d0c42db682b74d3661ad8bdcd7bb` but SDK had old key `pk_823e...`.
