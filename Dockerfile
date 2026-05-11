# ---------- Stage 1: builder ----------
FROM oven/bun:1-alpine AS builder

RUN apk add --no-cache python3 make g++ nodejs npm jq curl

WORKDIR /app

# Copy workspace manifests and lockfile for layer caching
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/admin/package.json ./apps/admin/
COPY packages/cli/package.json ./packages/cli/
COPY packages/core/package.json ./packages/core/
COPY packages/types/package.json ./packages/types/
COPY packages/dashboard-sdk/package.json ./packages/dashboard-sdk/
COPY packages/dashboard-shared/package.json ./packages/dashboard-shared/
COPY packages/client/package.json ./packages/client/
COPY packages/registry/package.json ./packages/registry/
COPY packages/admin/package.json ./packages/admin/
COPY packages/vendor/package.json ./packages/vendor/
COPY packages/providers/payout-stripe-connect/package.json ./packages/providers/payout-stripe-connect/
COPY integration-tests/package.json ./integration-tests/

# Remove turbo (native binary that fails to extract in Alpine) before install
RUN jq 'del(.devDependencies.turbo) | del(.packageManager)' package.json > pkg.tmp && mv pkg.tmp package.json

RUN bun install

# Copy all source
COPY apps/api/ ./apps/api/
COPY apps/admin/ ./apps/admin/
COPY packages/ ./packages/

# Build workspace packages in dependency order
RUN cd packages/types && bun run build
RUN cd packages/cli && bun run build
RUN cd packages/dashboard-sdk && bun run build
RUN cd packages/core && bun run build || true
RUN cd packages/admin && NODE_OPTIONS=--max-old-space-size=4096 bunx tsup --no-dts

# Build the Medusa API (generates /app/apps/api/.medusa/server/*)
RUN cd apps/api && bunx medusa build

# Build the custom Mercur admin Vite app (produces apps/admin/dist/)
RUN cd apps/admin && bunx vite build

# Remove bun-specific .npmrc inside the built server output before runtime stage picks it up
RUN rm -f /app/apps/api/.medusa/server/.npmrc || true

# ---------- Stage 2: runtime ----------
FROM oven/bun:1-alpine AS runtime

RUN apk add --no-cache nodejs npm curl

WORKDIR /app/apps/api/.medusa/server

# Cache key: generated server manifests ONLY. This layer stays cached unless
# the built package.json/package-lock.json changes (which only happens when
# upstream apps/api/package.json or its transitive deps change).
COPY --from=builder /app/apps/api/.medusa/server/package.json ./package.json
# Copy lockfile if Medusa's build emitted one; tolerate absence with a glob.
COPY --from=builder /app/apps/api/.medusa/server/package-lock.json* ./

RUN npm install --omit=dev --legacy-peer-deps

# Now copy the rest of the built server output (source-shaped, changes every build)
COPY --from=builder /app/apps/api/.medusa/server/ ./

# Copy the custom admin SPA into the runtime so DashboardBase can serve /dashboard
COPY --from=builder /app/apps/admin/dist/ ./admin/dist/

EXPOSE 9000

ENV NODE_ENV=staging
CMD ["npx", "medusa", "start"]
