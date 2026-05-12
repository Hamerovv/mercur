---
slug: oom-fix-dockerfile-vendor
status: complete
---

Added `ENV NODE_OPTIONS=--max-old-space-size=4096` to `Dockerfile.vendor` builder stage
after `bun install`, before workspace package build steps. Fixes tsup OOM during
`packages/vendor` compilation.
