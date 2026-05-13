---
phase: quick-260511-og2
plan: "01"
subsystem: admin-layout
tags: [sidebar, i18n, label, hebrew]
dependency_graph:
  requires: []
  provides: [admin-sidebar-sellers-label]
  affects: [packages/admin/src/components/layout/main-layout/main-layout.tsx]
tech_stack:
  added: []
  patterns: [hardcoded-hebrew-label]
key_files:
  modified:
    - packages/admin/src/components/layout/main-layout/main-layout.tsx
decisions:
  - "Used hardcoded Hebrew string literal instead of i18n t() call — intentional per plan, avoids translation indirection"
metrics:
  duration: "2m"
  completed: "2026-05-11T00:00:00Z"
---

# Phase quick-260511-og2 Plan 01: Rename Stores Sidebar Label to "מוכרים" Summary

Single-line edit swapping `t("stores.domain")` for the hardcoded Hebrew string `"מוכרים"` in `useCoreRoutes()`, making the vendor management entry discoverable in the admin sidebar.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Replace Stores label with hardcoded Hebrew "מוכרים" | ad4f44e6 | packages/admin/src/components/layout/main-layout/main-layout.tsx |

## Verification Results

1. `grep -n 'label: "מוכרים"'` — returns exactly 1 match at line 364. PASS
2. `grep -n 't("stores.domain")'` — returns 0 matches. PASS
3. `grep -A1 'label: "מוכרים"'` shows `to: "/stores"` on next line. PASS

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — label-only change, no new endpoints or auth paths introduced.

## Self-Check: PASSED

- File exists: packages/admin/src/components/layout/main-layout/main-layout.tsx — FOUND
- Commit ad4f44e6 — FOUND
