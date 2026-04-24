# Fix Seller Permissions, Address 403, and Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three issues: (1) `seller:update` permission error when editing store info; (2) 403 on address save + restrict country to Israel; (3) admin panel showing no sellers for approval.

**Architecture:**
All three issues share a common root: vendor endpoints for `:id`-based routes require `seller:update` RBAC policy which the system cannot fulfill (empty policy table). The fix is to create policy-free `me/address` endpoint for the backend, update the frontend to use it, restrict country to Israel, and rebuild Docker to propagate the CORS fix from the previous session that resolves the admin panel empty list.

**Tech Stack:** Medusa v2, Mercur marketplace, TypeScript, React, react-hook-form, Bun monorepo, Docker Compose

---

## Root Cause Summary

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | `seller:update` on store handle edit | Docker container not rebuilt — old bundle still served | Rebuild Docker |
| 2 | 403 on address save | `POST /vendor/sellers/:id/address` has RBAC policy `seller:update`; policy table is empty so check always fails | Create `POST /vendor/sellers/me/address` (no policies) and route frontend to it |
| 2b | All countries shown in address form | `CountrySelect` renders all countries from the `countries` array | Remove country select, hardcode `"il"` in form defaults |
| 3 | Admin panel shows no sellers | Docker container not rebuilt after root `.env` was created with ADMIN_CORS including port 7000 | Rebuild Docker |

---

## File Map

**Created:**
- `packages/core/src/api/vendor/sellers/me/address/route.ts` — new POST handler for vendor's own address update

**Modified:**
- `packages/core/src/api/vendor/sellers/middlewares.ts` — add middleware entry for `POST /vendor/sellers/me/address`
- `packages/vendor/src/hooks/api/sellers.tsx` — add `useUpdateSellerAddressMe` hook
- `packages/vendor/src/pages/settings/store/address/store-address-form.tsx` — use new hook, remove country select, hardcode Israel

---

## Task 1: Create `POST /vendor/sellers/me/address` backend route

**Files:**
- Create: `packages/core/src/api/vendor/sellers/me/address/route.ts`

- [ ] **Step 1: Create the directory and route file**

```bash
mkdir -p /Users/hadashamerovv/Documents/Coding/bookshook-marketplace/packages/core/src/api/vendor/sellers/me/address
```

- [ ] **Step 2: Write the route handler**

Create `packages/core/src/api/vendor/sellers/me/address/route.ts` with this exact content:

```typescript
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@mercurjs/types"

import { VendorUpsertSellerAddressType } from "../../validators"
import { updateSellerAddressWorkflow } from "../../../../../workflows/seller"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorUpsertSellerAddressType>,
  res: MedusaResponse<HttpTypes.VendorSellerResponse>
) => {
  const sellerId = req.seller_context!.seller_id

  await updateSellerAddressWorkflow(req.scope).run({
    input: {
      seller_id: sellerId,
      data: req.validatedBody,
    },
  })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [seller],
  } = await query.graph({
    entity: "seller",
    fields: req.queryConfig.fields,
    filters: { id: sellerId },
  })

  res.json({ seller })
}
```

---

## Task 2: Register the new route middleware

**Files:**
- Modify: `packages/core/src/api/vendor/sellers/middlewares.ts`

- [ ] **Step 1: Add the middleware entry for `POST /vendor/sellers/me/address`**

In `packages/core/src/api/vendor/sellers/middlewares.ts`, add this block immediately **after** the existing `POST /vendor/sellers/me` block (after line 54, before the `POST /vendor/sellers` block). The `me/address` entry must appear before any `:id/address` entries so the specific path takes priority.

Find this block (lines 43–54):
```typescript
  // POST /vendor/sellers/me — update current seller
  {
    method: ["POST"],
    matcher: "/vendor/sellers/me",
    middlewares: [
      validateAndTransformBody(VendorUpdateSeller),
      validateAndTransformQuery(
        VendorGetSellerParams,
        QueryConfig.retrieveVendorSellerQueryConfig
      ),
    ],
  },
```

Insert after it (before the `// POST /vendor/sellers — create seller` comment):
```typescript
  // POST /vendor/sellers/me/address — upsert current seller's address
  {
    method: ["POST"],
    matcher: "/vendor/sellers/me/address",
    middlewares: [
      validateAndTransformBody(VendorUpsertSellerAddress),
      validateAndTransformQuery(
        VendorGetSellerParams,
        QueryConfig.retrieveVendorSellerQueryConfig
      ),
    ],
  },
```

Note: No `policies` array — this is intentional. The `/me` routes bypass RBAC.

---

## Task 3: Add `useUpdateSellerAddressMe` hook to vendor

**Files:**
- Modify: `packages/vendor/src/hooks/api/sellers.tsx`

- [ ] **Step 1: Add `fetchQuery` to the imports from `../../lib/client`**

Find the existing import line in `packages/vendor/src/hooks/api/sellers.tsx`:
```typescript
import { sdk } from "../../lib/client";
```

Replace with:
```typescript
import { fetchQuery, sdk } from "../../lib/client";
```

- [ ] **Step 2: Add the `useUpdateSellerAddressMe` hook after `useUpdateSeller`**

Find the closing of `useUpdateSeller` (around line 78):
```typescript
  });
};

export const useUpdateSellerAddress = (
```

Insert the new hook between them:
```typescript
  });
};

export const useUpdateSellerAddressMe = (
  options?: UseMutationOptions<
    { seller: unknown },
    Error,
    Omit<InferClientInput<typeof sdk.vendor.sellers.$id.address.mutate>, "$id">
  >,
) => {
  return useMutation({
    mutationFn: (payload) =>
      fetchQuery("/vendor/sellers/me/address", {
        method: "POST",
        body: payload as object,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: sellersQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: membersQueryKeys.me(),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};

export const useUpdateSellerAddress = (
```

---

## Task 4: Update `store-address-form.tsx` — use new hook, hardcode Israel

**Files:**
- Modify: `packages/vendor/src/pages/settings/store/address/store-address-form.tsx`

- [ ] **Step 1: Replace the import and hook usage**

In `store-address-form.tsx`, change the import line:
```typescript
import { useUpdateSellerAddress } from "@hooks/api";
```
to:
```typescript
import { useUpdateSellerAddressMe } from "@hooks/api";
```

- [ ] **Step 2: Remove `seller.id` from hook call and update hook name**

Change line 46:
```typescript
  const { mutateAsync, isPending } = useUpdateSellerAddress(seller.id);
```
to:
```typescript
  const { mutateAsync, isPending } = useUpdateSellerAddressMe();
```

- [ ] **Step 3: Hardcode `country_code` to "il" in form defaults**

Change line 41 in the `defaultValues`:
```typescript
      country_code: address?.country_code ?? "",
```
to:
```typescript
      country_code: "il",
```

- [ ] **Step 4: Remove `CountrySelect` import and replace the field with a hidden input**

Remove the import line:
```typescript
import { CountrySelect } from "@components/inputs/country-select";
```

- [ ] **Step 5: Replace the `Form.Field` for `country_code` with a hidden input**

Find and replace the entire country_code Form.Field block:
```tsx
          <Form.Field
            control={form.control}
            name="country_code"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("fields.country")}</Form.Label>
                <Form.Control>
                  <CountrySelect {...field} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
```

Replace with:
```tsx
          <input type="hidden" {...form.register("country_code")} />
```

---

## Task 5: Rebuild Docker and verify all three fixes

- [ ] **Step 1: Stop containers**

```bash
cd /Users/hadashamerovv/Documents/Coding/bookshook-marketplace
docker compose down
```

- [ ] **Step 2: Rebuild the medusa and vendor images**

```bash
docker compose build medusa vendor
```

Expected: Build completes without errors. Medusa build runs `bunx medusa build` which compiles the backend including the new `me/address` route.

- [ ] **Step 3: Start containers**

```bash
docker compose up -d
```

- [ ] **Step 4: Wait for Medusa to be ready**

```bash
docker compose logs -f medusa
```

Wait until you see: `Server is running on port 9000`
Press Ctrl+C to stop following logs.

- [ ] **Step 5: Start the admin panel (runs separately, not in Docker)**

```bash
cd /Users/hadashamerovv/Documents/Coding/bookshook-marketplace/apps/admin-test
npm run dev
```

Admin opens at: http://localhost:7000

- [ ] **Step 6: Verify Issue 1 — store handle edit works**

1. Open http://localhost:7001 (vendor panel)
2. Log in as a vendor
3. Go to Settings → Store
4. Click Edit Store
5. Change the handle field
6. Click Save
7. Expected: No `seller:update` permission error — save succeeds

- [ ] **Step 7: Verify Issue 2 — address save works and country is Israel**

1. Still in vendor panel at http://localhost:7001
2. Go to Settings → Store → Address
3. Click Edit Address
4. Verify: No country dropdown visible (replaced by hidden input)
5. Fill in address fields
6. Click Save
7. Expected: No 403 error — address saves successfully

- [ ] **Step 8: Verify Issue 3 — admin panel shows sellers and approve button**

1. Open http://localhost:7000 (admin panel)
2. Log in as superadmin
3. Navigate to **Stores** in the left sidebar (NOT "Users" — that's Medusa admin users)
4. Expected: The pending seller created on port 7001 appears in the list
5. Click on the pending seller
6. Expected: "Approve" and "Reject" buttons appear in the header (visible when status is PENDING_APPROVAL)
7. Click Approve → confirm
8. Expected: Seller status changes to OPEN

**If sellers list is still empty after rebuild:**
- Open browser DevTools → Network tab
- Reload the Stores page
- Look for the `GET /admin/sellers` request
- Check the response — if 403: admin session expired, log out and back in
- If empty array: navigate to http://localhost:7001 and confirm a seller account exists

---

## Self-Review Checklist

- [x] Issue 1 (handle edit): Fixed by Docker rebuild — `useUpdateSeller()` now uses `POST /vendor/sellers/me` (no RBAC) and the backend handler correctly calls `updateSellersWorkflow`
- [x] Issue 2a (address 403): Fixed by new `POST /vendor/sellers/me/address` route without RBAC policies, new frontend hook using `fetchQuery`
- [x] Issue 2b (country restriction): Fixed by removing `CountrySelect`, adding hidden input, defaulting to `"il"`
- [x] Issue 3 (admin empty): Fixed by Docker rebuild which propagates root `.env` CORS fix (ADMIN_CORS includes port 7000)
- [x] Middleware ordering: `me/address` entry placed before `:id/address` — specific paths match first
- [x] No `seller.id` passed anywhere in address form — new hook reads seller ID from session context on backend
- [x] `fetchQuery` import added to sellers.tsx alongside existing `sdk` import
