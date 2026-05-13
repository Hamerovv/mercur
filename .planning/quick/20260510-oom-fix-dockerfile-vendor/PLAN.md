---
slug: oom-fix-dockerfile-vendor
date: 2026-05-10
status: in-progress
---

# Fix OOM in Dockerfile.vendor vendor package build

## Problem
`packages/vendor` build step hits Node.js JS heap limit (OOM) during tsup bundling.
The `|| true` masks the failure, but the pre-compiled workspace package is incomplete.
The Vite build of `apps/vendor` still succeeds by resolving source directly, but this is fragile.

## Fix
Set `NODE_OPTIONS=--max-old-space-size=4096` as an ENV var in the builder stage
before the workspace package build steps. This increases the Node heap for tsup.

## File
- `Dockerfile.vendor` — add `ENV NODE_OPTIONS=--max-old-space-size=4096` after `bun install`
