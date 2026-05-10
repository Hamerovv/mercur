---
phase: quick-260510-wiv
plan: "01"
subsystem: infrastructure/docker
tags: [dockerfile, caching, npm, multi-stage-build, performance]
dependency_graph:
  requires: []
  provides: [cached-prod-deps-layer]
  affects: [docker-compose, api-image-build-time]
tech_stack:
  added: []
  patterns: [multi-stage-docker-build, layer-cache-keying]
key_files:
  created: []
  modified:
    - Dockerfile
decisions:
  - Split builder/runtime to key npm install cache on generated .medusa/server/package.json
  - Runtime stage installs only nodejs npm (no build tools) — free image-size win
  - package-lock.json* glob tolerates absence without breaking cache key
metrics:
  duration: "~8.5 minutes (dominated by build1 docker pull + full build)"
  completed: "2026-05-10"
  tasks_completed: 2
  tasks_total: 3
---

# Phase quick-260510-wiv Plan 01: Restructure Dockerfile for npm install caching Summary

**One-liner:** Two-stage Dockerfile splits builder (bun+medusa build) from runtime (npm install keyed only on generated package.json) cutting incremental rebuild time from ~7.5 min to ~2 sec.

---

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Convert Dockerfile to multi-stage with cached prod-deps layer | `b1c73cdb` | `Dockerfile` |
| 2 | Validate prod-deps layer is actually cached on rebuild | (build validation — no file changes) | — |

---

## Cache Validation Results (Task 2)

### npm install layer cached: YES

Grep evidence from `/tmp/build2.log`:
```
#26 [runtime 6/7] RUN npm install --omit=dev --legacy-peer-deps
#26 CACHED
```

### Wall-clock time delta

| Build | Duration | Notes |
|-------|----------|-------|
| Build 1 (full) | ~461 seconds (~7.5 min) | Full build including bun install, medusa build, npm install |
| Build 2 (source touch only) | ~2 seconds | All 30 layers CACHED; only final COPY re-ran |
| Time saved | ~459 seconds | npm install layer entirely skipped |

### Source file touched between builds
`apps/api/src/scripts/seed.ts` — a `.ts` file inside `apps/api/src/`, not `apps/api/package.json`. Correctly busted the builder stage (re-ran `bunx medusa build`) but did NOT bust the runtime stage's `npm install` layer.

### Generated .medusa/server/package.json stability
The generated `package.json` content was byte-identical across both builds (same npm install layer hash reused). Medusa does NOT stamp a build timestamp into the generated manifest. Cache strategy is stable.

---

## Deviations from Plan

None — plan executed exactly as written.

The original Dockerfile had two diagnostic `RUN ls ...` lines (lines 45-46). These were dropped per plan instructions ("they are noise and each adds a (tiny) cached layer"). The `.npmrc` removal was moved from `apps/api/.npmrc` (original location) to `apps/api/.medusa/server/.npmrc` (per plan) because the runtime stage's WORKDIR is the server directory.

---

## Checkpoint Pending

**Task 3** (human-verify gate) is outstanding. The user must:
1. `docker compose up -d api && docker compose logs -f api`
2. Confirm Medusa starts cleanly (no MODULE_NOT_FOUND errors)
3. `curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:9000/health` → expect 200

---

## Known Stubs

None.

---

## Threat Flags

None — this change is build-system only; no new network endpoints, auth paths, file access patterns, or schema changes introduced.

---

## Self-Check: PASSED

- [x] Dockerfile exists at worktree root: FOUND
- [x] Commit b1c73cdb exists in git log
- [x] Build 1 succeeded (`Successfully tagged bookshook-api:cache-test`)
- [x] Build 2 grep confirmed: `#26 CACHED` on npm install line
