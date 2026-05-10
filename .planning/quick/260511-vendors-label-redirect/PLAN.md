---
slug: vendors-label-redirect
date: 2026-05-11
status: in-progress
---

# Quick Task: Vendors Label + Redirect

## Goal
Make admin sidebar show "Vendors" instead of "Stores" and make /vendors URL work.

## Root Cause
In Mercur, vendors = stores. The sidebar labels it "Stores" via `t("stores.domain")`.
No `/vendors` route exists — only `/stores`.

## Changes

### 1. packages/admin/src/i18n/translations/en.json
- Change `stores.domain` value from `"Stores"` to `"Vendors"`

### 2. packages/admin/src/get-route-map.tsx
- Add a redirect route: `{ path: "/vendors", element: <Navigate to="/stores" replace /> }`
  near the other top-level routes (around line 802 where /stores is defined)

## Files
- `packages/admin/src/i18n/translations/en.json`
- `packages/admin/src/get-route-map.tsx`
