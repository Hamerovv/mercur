---
phase: quick-260511-v1k
plan: "01"
type: execute
subsystem: api-config
tags: [medusa-config, admin, quick-fix]
dependency_graph:
  requires: []
  provides: [standard-medusa-admin-disabled]
  affects: [apps/api/medusa-config.ts]
tech_stack:
  added: []
  patterns: [medusa-config admin.disable flag]
key_files:
  modified:
    - apps/api/medusa-config.ts
decisions:
  - "Set top-level admin.disable=true to stop Medusa serving /app/ admin; leave admin-ui module (disable:false) so /dashboard/ continues serving the Mercur custom admin"
metrics:
  duration: "~8 minutes (including docker build)"
  completed: "2026-05-11"
---

# Quick 260511-v1k: Disable Standard Medusa Admin — Summary

One-liner: Set `admin.disable: true` in medusa-config.ts to stop the built-in Medusa admin from serving at /app/, while leaving the custom Mercur admin-ui module enabled at /dashboard/.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Set top-level `admin.disable` from `false` to `true` | dfbdeb42 |
| 2 | Rebuilt medusa Docker image and restarted container | (no code change — infra only) |
| 3 | Human verification | PENDING — see below |

## Change Detail (Task 1)

File: `apps/api/medusa-config.ts`, line 9.

```diff
  admin: {
-   disable: false,
+   disable: true,
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  },
```

The two `disable: false` entries inside `modules[0]` (admin-ui at /dashboard) and `modules[1]` (vendor-ui at /seller) are untouched.

## Task 2 — Docker Rebuild

Commands run:
```
docker compose build medusa   # succeeded — image rebuilt with updated config
docker compose up -d medusa   # container recreated and restarted; status: healthy
```

Verification: `docker compose ps medusa` shows `State: running, Health: healthy`. `curl http://localhost:9000/dashboard` returns HTTP 301.

## Task 3 — Human Verification Required (Checkpoint Skipped)

This task is a `checkpoint:human-verify`. Per execution constraints it is skipped by the agent. The user must manually verify:

1. Open http://localhost:9000/app/ — EXPECTED: 404 or blank (standard Medusa admin should NOT load).
2. Open http://localhost:9000/dashboard/ — EXPECTED: custom Mercur admin loads with Hebrew sidebar label "מוכרים".
3. Navigate to http://localhost:9000/dashboard/vendors — EXPECTED: vendors list renders (no 404).

If step 1 still shows the generic Medusa admin, the config change did not take effect — check that the container actually uses the rebuilt image (`docker compose ps medusa` image hash should match the build output).

## Deviations from Plan

None — plan executed exactly as written. Task 3 skipped per executor constraints (checkpoint:human-verify requires human).

## Self-Check

- [x] `apps/api/medusa-config.ts` modified: `disable: true` on line 9
- [x] Commit dfbdeb42 exists
- [x] medusa container healthy after rebuild
- [x] /dashboard returns 301

## Self-Check: PASSED
