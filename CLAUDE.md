# Mercur

Open source marketplace platform built on MedusaJS. Follows a shadcn-like CLI approach where code is copied directly into projects for full ownership.

## Project Structure

```
mercur/
├── apps/
│   └── docs/             # Documentation site (Mintlify)
├── packages/
│   ├── admin/            # Admin dashboard UI
│   ├── cli/              # @mercurjs/cli - CLI tool
│   ├── client/           # @mercurjs/client - API client
│   ├── core/      # @mercurjs/core - Core Medusa plugin (modules, workflows, providers)
│   ├── dashboard-sdk/    # @mercurjs/dashboard-sdk - Vite plugin for dashboards
│   ├── dashboard-shared/ # Shared UI components for admin and vendor dashboards
│   ├── registry/         # Official block registry
│   ├── types/            # @mercurjs/types - Type definitions
│   └── vendor/           # @mercurjs/vendor - Vendor portal UI components
├── packages/providers/
│   └── payout-stripe-connect/ # @mercurjs/payout-stripe-connect - Stripe Connect payout provider
├── templates/
│   ├── basic/            # Basic marketplace template
│   └── registry/         # Template for custom registries
```

## Key Concepts

### Blocks

Reusable code pieces that can be installed via CLI:

- **Modules** - Data models and business logic
- **Links** - Relationships between modules
- **Workflows** - Multi-step business processes
- **API Routes** - HTTP endpoints
- **Admin Extensions** - Admin dashboard customizations
- **Vendor Extensions** - Vendor portal customizations

## CLI Commands (`packages/cli`)

### `mercurjs create [name]`

Create a new Mercur project from template.

**Options:**

- `-t, --template <template>` - Template: `basic` or `registry`
- `--no-deps` - Skip dependency installation
- `--skip-db` - Skip database configuration
- `--skip-email` - Skip email collection
- `--db-connection-string <string>` - PostgreSQL connection string

### `mercurjs init`

Initialize project configuration (`blocks.json`).

**Options:**

- `-y, --yes` - Skip confirmation
- `-d, --defaults` - Use default paths
- `-s, --silent` - Mute output

### `mercurjs add <blocks...>`

Add blocks from registry to project.

**Options:**

- `-y, --yes` - Skip confirmation
- `-o, --overwrite` - Overwrite existing files
- `-s, --silent` - Mute output

### `mercurjs search`

Search available blocks in registries.

**Options:**

- `-q, --query <query>` - Search query
- `-r, --registry <registry>` - Registry to search (default: `@mercurjs`)

### `mercurjs view <blocks...>`

Display detailed block information.

### `mercurjs build [registry]`

Build registry into JSON files for distribution.

**Options:**

- `-o, --output <path>` - Output directory (default: `./r`)
- `-v, --verbose` - Show detailed output

### `mercurjs diff <blocks...>`

Compare local blocks against registry versions.

### `mercurjs codegen`

Generate TypeScript types from API routes.

**Options:**

- `-w, --watch` - Watch mode for auto-regeneration

### `mercurjs info`

Display project configuration and diagnostics.

### `mercurjs telemetry`

Control anonymous usage data collection.

**Options:**

- `--enable` - Enable telemetry
- `--disable` - Disable telemetry

## Dashboard SDK (`packages/dashboard-sdk`)

Vite plugin providing build-time integration for dashboard applications.

### Features

- **Configuration Management** - Loads `mercur.config.ts`
- **Route Generation** - Auto-generates routes from file-based structure
- **Component Registration** - Lazy-loads custom components via virtual modules
- **Hot Module Reloading** - Detects changes and restarts dev server

### Virtual Modules

```typescript
import routes from "virtual:mercur/routes"; // Generated route array
import config from "virtual:mercur/config"; // Configuration object
import components from "virtual:mercur/components"; // Component registry
```

### File-Based Routing

- `src/pages/page.tsx` → `/`
- `src/pages/users/[id]/page.tsx` → `/users/:id`
- `src/pages/users/[[id]]/page.tsx` → `/users/:id?` (optional)
- `src/pages/search/[*].tsx` → `/search/*` (splat)
- `src/pages/(group)/foo/page.tsx` → `/foo` (route grouping)
- `src/pages/dashboard/@sidebar/page.tsx` → Parallel route

### Usage

```typescript
// vite.config.ts
import { dashboardPlugin } from "@mercurjs/dashboard-sdk";

export default {
  plugins: [react(), dashboardPlugin()],
};
```

## Vendor Package (`packages/vendor`)

React-based vendor portal UI framework.

## Core Package (`packages/core`)

MedusaJS v2 plugin providing marketplace functionality.

## Documentation (`apps/docs`)

Documentation site built with [Mintlify](https://mintlify.com). Configuration lives in `docs.json`.

- **Content format**: MDX files
- **API Reference**: Auto-generated from OpenAPI spec (`api-reference/combined.oas.json`)
- **Sections**: Quick start, Core Concepts, Product (modules, workflows, events, subscribers), Integrations, Deployment, API Reference, Changelog
- **Dev server**: `mintlify dev` from `apps/docs/`

## Skills (`.claude/skills/`)

Before writing ANY admin UI code, invoke the relevant skill. Skills contain hard rules and exact code patterns.

| Skill | When to use |
|-------|-------------|
| `admin-page-ui` | List pages, detail pages, Container sections, ActionMenu, empty states |
| `admin-form-ui` | Form fields, edit drawers (RouteDrawer), create modals (RouteFocusModal) |
| `admin-tab-ui` | Tabbed wizard forms (ProgressTabs, TabbedForm) |
| `medusa-ui-conformance` | Before adding any custom UI — check if @medusajs/ui or local wrapper exists |
| `cc-alignment` | Renaming/restructuring compound component exports |
| `compound-components-migration-review` | Migrating pages to compound component pattern |
| `code-review` | After completing implementation, before merging |
| `admin-ui-review` | Reviewing admin UI code for pattern consistency |

## Reusable Components (`packages/admin/src/components/`)

**ALWAYS search for existing components before writing custom UI.** Never hand-roll what already exists.

| Component | Path | Use for |
|-----------|------|---------|
| `HandleInput` | `components/inputs/handle-input/` | Handle/slug fields with `/` prefix |
| `ChipInput` | `components/inputs/chip-input/` | Tag-like multi-value inputs |
| `SwitchBox` | `components/common/switch-box/` | Switch with label + description card |
| `Form.*` | `components/common/form/` | All form fields (Field, Label, Control, ErrorMessage, Hint) |
| `ActionMenu` | `components/common/action-menu/` | Dropdown action menus (edit, delete) |
| `SectionRow` | `components/common/section/` | Key-value rows in detail sections |
| `RouteDrawer` | `components/modals/` | Edit drawers with route-based open/close |
| `RouteFocusModal` | `components/modals/` | Create modals with route-based open/close |
| `useRouteModal` | `components/modals/` | Get `handleSuccess()` — must be INSIDE RouteDrawer/RouteFocusModal |
| `KeyboundForm` | `components/utilities/keybound-form/` | Form with Ctrl+Enter submit |
| `_DataTable` | `components/table/data-table/` | Table with filters, search, sort, pagination |
| `SingleColumnPage` | `components/layout/pages/` | List page wrapper |
| `TwoColumnPage` | `components/layout/pages/` | Detail page wrapper (Main + Sidebar) |
| `useDataTable` | `hooks/use-data-table` | Table state (pagination, row selection) synced to URL |
| `useQueryParams` | `hooks/use-query-params` | Extract typed query params from URL |

## Architecture

- **Foundation**: MedusaJS v2 (headless commerce)
- **Language**: TypeScript
- **Monorepo**: Turborepo
- **Package Manager**: bun

## Configuration Files

- `blocks.json` - Project configuration with path aliases
- `registry.json` - Registry definition with block metadata
- `mercur.config.ts` - Dashboard/vendor app configuration
- `medusa-config.ts` - MedusaJS configuration

## Supported Deployment Vendors

- Medusa Cloud
- Railway
- Render
- Fly.io
- Heroku
- DigitalOcean
- Koyeb

<!-- GSD:project-start source:PROJECT.md -->
## Project

**bookshook — Multi-Vendor Marketplace**

A multi-vendor book marketplace built on Mercur.js 2.0 (MedusaJS 2.13.6). Three applications run together under Docker:

1. **Storefront** (port 8000) — Next.js B2C shopping experience for buyers
2. **Vendor Panel** (port 7001) — React/Vite dashboard for sellers to manage products, orders, payouts
3. **Superadmin Panel** (port 9000/dashboard) — MedusaJS admin extended with Mercur vendor-management widgets

**Core Value:** Buyers can discover and purchase books from multiple independent vendors in a single checkout flow, while vendors self-manage their catalogues and orders, and a superadmin controls the platform.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Backend
| Technology | Pinned Version | Role |
|------------|---------------|------|
| `@medusajs/medusa` | **2.13.6** | Core commerce engine |
| `@medusajs/framework` | **2.13.6** | DI container, module system, workflow runner |
| `@medusajs/cli` | **2.13.6** | `medusa develop` / `medusa build` |
| `@medusajs/dashboard` | **2.13.6** | Superadmin UI served at `/dashboard` |
| `@medusajs/admin-sdk` | **2.13.6** | Admin extension API |
| `@medusajs/admin-shared` | **2.13.6** | Shared types between admin + vendor |
| `@medusajs/draft-order` | **2.13.6** | Draft-order module (optional feature) |
| `@medusajs/core-flows` | **^2.13.4** (peer) | Pre-built workflows (upload, order, etc.) |
| `@mercurjs/core` | **2.0.2** (workspace `*`) | Multi-vendor plugin — all seller/commission/payout logic |
| `@mercurjs/cli` | **2.0.2** (workspace `*`) | `mercurjs develop` / `mercurjs start` replaces medusa CLI |
| `@mercurjs/types` | **2.0.2** (workspace `*`) | Shared DTO types (SellerDTO, etc.) |
| PostgreSQL | **15** | Primary store |
| Redis | **latest** | Cache + BullMQ job queue |
| Node.js | **>=20** | Runtime (engines field enforced) |
| Bun | **1.3.8** | Package manager + monorepo workspace runner |
| Turborepo | **^2.7.4** | Task graph + build cache |
### Storefront
| Technology | Pinned Version | Role |
|------------|---------------|------|
| Next.js | **^14.2.29** | App Router, RSC, server-side SDK calls |
| React | **^18.3.1** | UI runtime |
| `@medusajs/js-sdk` | **^2.13.0** | Official Medusa store API client (replaces `@medusajs/medusa-js`) |
| Tailwind CSS | **^3.4.1** | Styling |
| TypeScript | **^5** | Types |
- `serverSdk` — server-side in RSC/server actions, points to internal Docker URL
- `sdk` — `"use client"` components, points to public URL
### Vendor Panel
| Technology | Pinned Version | Role |
|------------|---------------|------|
| React | **^18.3.1** | UI runtime |
| Vite | **^5.4.21** | Dev server + bundler |
| `@mercurjs/vendor` | **2.0.2** (workspace) | Pre-built vendor UI pages — mount as `<App />` in main.tsx |
| `@mercurjs/dashboard-sdk` | **2.0.2** (workspace) | Vite plugin: file-based routing, virtual modules, HMR |
| `@mercurjs/dashboard-shared` | **2.0.2** (workspace) | Shared UI components between admin and vendor dashboards |
| `@mercurjs/client` | **2.0.2** (workspace) | Typed API client for `/vendor/*` endpoints |
| `@medusajs/ui` | **4.1.1** (pinned exact) | MedusaJS design system — **pin this exact version** |
| `@medusajs/icons` | **^2.13.4** | Icon set matching UI version |
| `@tanstack/react-query` | **5.64.2** (pinned exact) | Server-state management |
| `@tanstack/react-table` | **8.20.5** | Table primitives |
| `react-router-dom` | **6.30.3** (pinned exact) | Client routing |
| `react-hook-form` | **7.49.1** (pinned exact) | Form state |
| `@hookform/resolvers` | **3.4.2** | Zod integration for RHF |
| `zod` | **3.25.76** (pinned exact) | Schema validation |
| `react-i18next` | **13.5.0** (pinned exact) | i18n |
| `i18next` | **23.7.11** | i18n core |
| `radix-ui` | **1.1.2** | Headless primitives (umbrella package) |
| `react-jwt` | **^2.0.0** | JWT decode (display-only, no signing) |
| `jsonwebtoken` | **9.0.2** | JWT operations |
| TypeScript | **5.9.3** (pinned exact) | Types — **do not upgrade to 6.x without verifying Medusa compatibility** |
- React Query: ALL server-state (products, orders, sellers, analytics)
- React Context: auth token / current user only (thin layer)
- Zustand: do not add — unnecessary complexity, React Query covers mutations + cache
- Use MedusaJS `/auth/member/emailpass` for login — returns session cookie
- Credentials are stored in session cookie (`credentials: 'include'` on all requests)
- `react-jwt` is used for display-only (decode JWT to show member name) — not for auth verification
- Check auth state with `client.vendor.members.me.query()` on app load
- On 401: redirect to `/login`
- No localStorage token storage — cookie-based session only
### Infrastructure
| Technology | Version | Role |
|------------|---------|------|
| Docker Compose | v2 | 5 services: db, redis, api, vendor, storefront |
| PostgreSQL | **15** | Primary database |
| Redis | latest | Cache + BullMQ |
| Turborepo | **^2.7.4** | Monorepo task graph |
| Bun | **1.3.8** | Workspace package manager (`packageManager` field) |
## Package Versions (Exact Pins)
| Package | Exact Pin | Why |
|---------|-----------|-----|
| `@medusajs/ui` | `4.1.1` | Mercur dashboard-shared and admin/vendor all pin this exact version |
| `@tanstack/react-query` | `5.64.2` | `@mercurjs/client` depends on this exact minor |
| `@tanstack/react-table` | `8.20.5` | Shared across dashboard-shared/vendor/admin |
| `react-router-dom` | `6.30.3` | Mercur vendor routing built against this version |
| `react-hook-form` | `7.49.1` | Mercur form components built against this version |
| `zod` | `3.25.76` | Validators across core + vendor |
| `react-i18next` | `13.5.0` | i18n integration |
| `typescript` | `5.9.3` | All packages compiled with this version |
| `@hookform/resolvers` | `3.4.2` | Paired with RHF version |
| `radix-ui` | `1.1.2` | Umbrella package used in vendor/dashboard-shared |
## What NOT to Use
### GraphQL layer on top of MedusaJS
### Prisma on top of MedusaJS ORM
### Raw fetch for vendor API calls
### `@medusajs/js-sdk` in the vendor panel
### Zustand for vendor panel state
### Next.js for vendor panel
### `@mercurjs/core-plugin` npm package in this repo
### `localStorage` for auth tokens in vendor panel
### Upgrading TypeScript to 6.x without verification
## Confidence Notes
| Area | Confidence | Basis |
|------|------------|-------|
| Core package versions (Medusa, Mercur) | HIGH | Direct inspection of all package.json files |
| State management recommendation (React Query) | HIGH | `@mercurjs/client` depends on it; existing hooks use it |
| API client pattern (`@mercurjs/client`) | HIGH | Code in `packages/client/src/index.ts` + `apps/vendor/src/lib/client.ts` |
| Auth pattern (cookie-based `member` session) | HIGH | Middleware source in `packages/core/src/api/vendor/middlewares.ts` |
| File upload pattern | HIGH | Backend route in `packages/core/src/api/vendor/uploads/route.ts` confirmed |
| Storefront API client (`@medusajs/js-sdk`) | HIGH | Code in `apps/storefront/src/lib/sdk.ts` + `client-sdk.ts` |
| TypeScript version freeze at 5.9.3 | HIGH | All package.json files pin exact same version |
| Exact pin list for Mercur packages | HIGH | Cross-referenced all package.json files |
| "What NOT to use" items | MEDIUM | Architecture analysis; some items (Prisma, GraphQL) based on known MedusaJS 2.x constraints |
| File storage backend (Medusa file module) | MEDIUM | Upload route uses `uploadFilesWorkflow` which is provider-agnostic; actual provider config not inspected |
| Bun 1.3.13 upgrade safety | LOW | No lockfile diff available; test before committing to it |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| admin-form-ui | Enforce correct form UI patterns when creating or modifying forms in packages/admin. Use when writing form fields, edit drawers, create modals, or any form-based UI in the admin package. Covers Form.Field pattern, labels, errors, hints, grids, submit guards, drawer/modal structure. | `.claude/skills/admin-form-ui/SKILL.md` |
| admin-page-ui | Enforce correct page and section UI patterns when creating or modifying admin pages. Use when building list pages, detail pages, Container sections, action menus, empty states, delete flows, or any page-level UI in packages/admin. | `.claude/skills/admin-page-ui/SKILL.md` |
| admin-tab-ui | Enforce correct tab UI patterns when creating custom tabs for TabbedForm wizards in packages/admin. Use when adding new tabs to product create, price list create, or any multi-step form wizard. Covers defineTabMeta, layout, heading levels, section structure, i18n. | `.claude/skills/admin-tab-ui/SKILL.md` |
| admin-ui-review | Review admin UI code for consistency with established patterns. Use after writing any UI code in packages/admin to catch anti-patterns — wrong form components, hardcoded strings, missing i18n, incorrect heading levels, manual error rendering, missing data-testid, raw Controller usage. | `.claude/skills/admin-ui-review/SKILL.md` |
| cc-alignment | Align existing Compound Component pages to vendor standard naming and structure. Use when renaming CC exports, adding slot prefixes, refactoring list headers to nested compounds, updating barrel exports, fixing DTS build blockers, or updating testing registry consumer pages. | `.claude/skills/cc-alignment/SKILL.md` |
| code-review | Review code changes for contract compliance, type safety, and regression risk. Use after completing any non-trivial implementation, before merging PRs, or when asked to review code quality across any mercur package. | `.claude/skills/code-review/SKILL.md` |
| compound-components-migration | Plan, implement, and review admin page migrations to Compound Components and TabbedForm with strict regression prevention (loading/error gating, keyboard submit paths, dynamic tab visibility, context typing, and dead abstraction APIs). Use when writing or reviewing migration code in packages/admin. | `.claude/skills/compound-components-migration-review/SKILL.md` |
| medusa-ui-conformance | Keep custom admin and vendor UI aligned with @medusajs/ui and Radix UI. Use when adding or modifying reusable UI, page-level interaction patterns, overlays, menus, form primitives, or any custom component in Mercur dashboards. | `.claude/skills/medusa-ui-conformance/SKILL.md` |
| mercur-blocks | Discover, evaluate, install, and verify Mercur blocks safely using `blocks.json` aliases and Mercur CLI workflows. Use when adding or updating blocks in a Mercur project. | `.claude/skills/mercur-blocks/SKILL.md` |
| mercur-cli | Use Mercur CLI commands correctly for project setup, block discovery, block installation, and starter maintenance. Use when working with `create`, `init`, `add`, `search`, `view`, or `diff`. | `.claude/skills/mercur-cli/SKILL.md` |
| migration-guide | Plan and execute migration from Mercur 1.x to 2.0. Classifies project difficulty, reads relevant migration docs, and follows stop conditions. | `.claude/skills/migration-guide/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
