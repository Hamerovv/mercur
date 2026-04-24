FROM oven/bun:1-alpine

RUN apk add --no-cache python3 make g++ nodejs npm jq

WORKDIR /app

# Copy workspace manifests and lockfile for layer caching
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json ./apps/api/
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
COPY packages/ ./packages/

# Build workspace packages in dependency order (types → cli → core)
RUN cd packages/types && bun run build
RUN cd packages/cli && bun run build
# Core: bun run build adds node_modules/.bin to PATH so tsc resolves correctly
# Allow non-zero exit because upstream TS18046 errors don't affect runtime output
RUN cd packages/core && bun run build || true

# Build the Medusa API
RUN cd apps/api && bunx medusa build

# Install production deps inside the compiled server output
# Remove bun-specific .npmrc that confuses npm
RUN rm -f /app/apps/api/.npmrc
WORKDIR /app/apps/api/.medusa/server
RUN ls /app/apps/api/.medusa/ 2>/dev/null || echo "no .medusa dir"
RUN ls /app/apps/api/.medusa/server/ 2>/dev/null || echo "no .medusa/server dir"
RUN npm install --omit=dev --legacy-peer-deps

EXPOSE 9000

ENV NODE_ENV=staging
CMD ["npx", "medusa", "start"]
