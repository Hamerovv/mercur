---
phase: quick-260511-3bg
plan: "01"
subsystem: admin-app
tags: [vite, admin, docker, medusa-config, mercurjs]
dependency_graph:
  requires: []
  provides: [apps/admin Vite workspace, admin dist in runtime image, appDir wired to {cwd}/admin]
  affects: [Dockerfile, apps/api/medusa-config.ts]
tech_stack:
  added: ["@mercurjs/admin (workspace dep)", "apps/admin Vite app"]
  patterns: ["mirror apps/vendor structure", "base /dashboard/ Vite config", "path.join(process.cwd()) appDir resolution"]
key_files:
  created:
    - apps/admin/index.html
    - apps/admin/package.json
    - apps/admin/tsconfig.json
    - apps/admin/tsconfig.app.json
    - apps/admin/tsconfig.node.json
    - apps/admin/vite.config.ts
    - apps/admin/src/main.tsx
    - apps/admin/public/bookshook-logo.png
  modified:
    - Dockerfile
    - apps/api/medusa-config.ts
decisions:
  - "Used base: '/dashboard/' in vite.config.ts so built asset URLs match where DashboardBase mounts the SPA"
  - "Omitted components override block from admin vite.config.ts (vendor-specific StoreSetup not needed for admin)"
  - "appDir uses path.join(process.cwd(), 'admin') resolving to /app/apps/api/.medusa/server/admin at runtime"
metrics:
  duration: "~5 minutes"
  completed: "2026-05-11"
  tasks_completed: 3
  files_created: 8
  files_modified: 2
---

# Phase quick-260511-3bg Plan 01: Create apps/admin Vite App Summary

**One-liner:** Standalone Vite app at apps/admin/ builds @mercurjs/admin into dist/ with base /dashboard/, wired through Dockerfile builder+runtime stages and medusa-config.ts appDir so the Mercur custom admin renders at /dashboard instead of "Dashboard not built".

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Scaffold apps/admin Vite app mirroring apps/vendor | 7af1a1fc | apps/admin/* (8 files) |
| 2 | Wire Dockerfile to build admin and copy dist into runtime | 5fce3d5b | Dockerfile |
| 3 | Point admin-ui module appDir at {cwd}/admin | c8ee69ff | apps/api/medusa-config.ts |

## appDir Resolution Chain

```
medusa-config.ts: appDir: path.join(process.cwd(), 'admin')
  => runtime CWD: /app/apps/api/.medusa/server/
  => resolved: /app/apps/api/.medusa/server/admin/

Dockerfile COPY: /app/apps/admin/dist/ -> ./admin/dist/
  => runtime path: /app/apps/api/.medusa/server/admin/dist/

DashboardBase appends: /dist/index.html
  => final: /app/apps/api/.medusa/server/admin/dist/index.html  [EXISTS]
```

## Key Implementation Details

### apps/admin structure
- `package.json`: `@bookshook/admin`, depends on `@mercurjs/admin: "*"` (swapped from vendor's `@mercurjs/vendor`)
- `src/main.tsx`: identical to apps/vendor pattern with `@mercurjs/admin` imports
- `vite.config.ts`: adds `base: '/dashboard/'` so asset URLs are prefixed correctly; no `components` override (vendor-specific)
- All tsconfig files copied verbatim from apps/vendor

### Dockerfile changes (4 edits)
1. `COPY apps/admin/package.json ./apps/admin/` — before `bun install` for workspace resolution
2. `COPY apps/admin/ ./apps/admin/` — full source in builder stage
3. `RUN cd apps/admin && bunx vite build` — after medusa build
4. `COPY --from=builder /app/apps/admin/dist/ ./admin/dist/` — runtime stage

### medusa-config.ts changes
- Added `import path from 'path'`
- `appDir: ''` -> `appDir: path.join(process.cwd(), 'admin')` for admin-ui module only
- vendor-ui module left unchanged (out of scope)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - no placeholder data or stub patterns introduced.

## Threat Flags

None - no new network endpoints or auth paths introduced. Admin app is a static SPA served by existing DashboardBase infrastructure.

## Self-Check: PASSED

- apps/admin/index.html: EXISTS
- apps/admin/src/main.tsx: EXISTS
- apps/admin/vite.config.ts: EXISTS
- apps/admin/package.json: EXISTS
- apps/admin/public/bookshook-logo.png: EXISTS
- Commits 7af1a1fc, 5fce3d5b, c8ee69ff: FOUND
