---
status: complete
date: 2026-05-11
commit: 0410d7b0
---

# Summary: Vendors Label + Redirect

## Root Cause
In Mercur, vendor management lives at `/stores` labeled "Stores". No `/vendors` route existed.

## Changes Made
1. `packages/admin/src/i18n/translations/en.json` — `stores.domain`: "Stores" → "Vendors"
2. `packages/admin/src/get-route-map.tsx` — added `Navigate` import + `/vendors` → `/stores` redirect route

## Result
- Sidebar now shows "Vendors" instead of "Stores"
- `/vendors` redirects to `/stores` (the full vendor management page)
- No new pages created — Mercur's existing stores feature handles all vendor management
