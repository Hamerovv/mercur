# BookShook QA & Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit and fix every critical flow in the BookShook marketplace: admin/vendor login, buyer/seller registration, storefront purchase flow, order tracking, Hebrew UI, "BookShook" branding, logo visibility, and blocking raw Medusa panel access.

**Architecture:** Three apps (storefront :8000 Next.js, vendor :7001 Vite/React, admin at /dashboard Vite/React) talk to a Medusa backend at :9000. The vendor and admin UIs come from `@mercurjs/vendor` and `@mercurjs/admin` packages mounted in thin host apps. Custom code lives in `apps/storefront/src`, `apps/vendor/src`, and `apps/api/src`.

**Tech Stack:** Next.js 14 (storefront), React/Vite (admin + vendor), MedusaJS 2.13.6, @mercurjs/core 2.0.2, @medusajs/js-sdk, TailwindCSS, TypeScript, Docker Compose

---

## Pre-flight: bring up the stack

Before any task, the stack must be running locally. These steps are not code changes — they verify the environment.

- [ ] **Start containers**

```bash
cd /Users/hadashamerovv/Documents/Coding/bookshook-marketplace
docker compose up -d
```

- [ ] **Wait for healthchecks**

```bash
docker compose ps
# All services should show "healthy" or "running"
# medusa may take 60-90s to seed on first boot
```

- [ ] **Confirm backend alive**

```bash
curl -s http://localhost:9000/health
# Expected: {"status":"ok"}
```

---

## Task 1: Fix logo clipping in storefront nav

**Files:**
- Modify: `apps/storefront/src/components/nav.tsx:12-13`

**Problem:** Nav is `h-16` (64 px) but the logo uses `h-20` (80 px). The logo overflows and is clipped by `overflow-hidden` on parent containers.

**Fix:** Increase nav height to `h-24` and add `overflow-visible` so the logo breathes, OR keep `h-16` and switch logo to `h-14`. The h-24 option keeps the logo prominent.

- [ ] **Edit nav.tsx**

Replace:
```tsx
<nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
  <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
```
With:
```tsx
<nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
  <div className="max-w-7xl mx-auto px-4 h-24 flex items-center justify-between">
```

File: `apps/storefront/src/components/nav.tsx`

- [ ] **Verify in browser**

Open http://localhost:8000 and confirm the BookShook logo is fully visible and not clipped.

- [ ] **Commit**

```bash
git add apps/storefront/src/components/nav.tsx
git commit -m "fix: increase nav height so BookShook logo is not clipped"
```

---

## Task 2: Set store name to "BookShook" in seed

**Files:**
- Modify: `apps/api/src/scripts/seed.ts:122-129`

**Problem:** The seed updates currency and sales channel but never sets the store's `name` field. The Medusa admin panel will show the default name "Medusa Store".

- [ ] **Add store name update to seed** — after the existing `updateStoresWorkflow` call that sets `default_sales_channel_id` (around line 122), add:

```typescript
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        name: "BookShook",
      },
    },
  });
  logger.info("Updated store name to BookShook.");
```

File: `apps/api/src/scripts/seed.ts`

- [ ] **Re-run seed in the running container**

```bash
docker compose exec medusa sh -c "cd /app/apps/api/.medusa/server && npx medusa exec ./src/scripts/seed.js"
```

Expected output includes: `Updated store name to BookShook.`

- [ ] **Verify in admin panel**

Open http://localhost:9000/dashboard → Settings → Store. The store name should show "BookShook".

- [ ] **Commit**

```bash
git add apps/api/src/scripts/seed.ts
git commit -m "fix: seed sets store name to BookShook"
```

---

## Task 3: Translate store-setup widget to Hebrew

**Files:**
- Modify: `apps/vendor/src/components/store-setup/store-setup.tsx:43-66,95`

**Problem:** The vendor store-setup onboarding widget (shown on the vendor dashboard) contains hardcoded English strings: "Complete store profile", "Add store details", "Add address", "Add company details", "Add payment details".

- [ ] **Replace English strings with Hebrew**

In `apps/vendor/src/components/store-setup/store-setup.tsx`:

Change `getProfileSteps` return array labels:
```typescript
  return [
    {
      key: "store_details",
      label: "הוסף פרטי חנות",
      completed: hasStoreDetails,
      path: "/settings/store/edit",
    },
    {
      key: "address",
      label: "הוסף כתובת",
      completed: hasAddress,
      path: "/settings/store/address",
    },
    {
      key: "company_details",
      label: "הוסף פרטי חברה",
      completed: hasCompanyDetails,
      path: "/settings/store/professional-details",
    },
    {
      key: "payment_details",
      label: "הוסף פרטי תשלום",
      completed: hasPaymentDetails,
      path: "/settings/store/payment-details",
    },
  ];
```

Change the collapsible trigger text (line ~95):
```tsx
<Text size="large" weight="plus" leading="compact">
  השלם פרופיל חנות
</Text>
```

- [ ] **Verify vendor panel**

Open http://localhost:7001, log in as seller@bookshook.com / Vendor123. The onboarding widget should show Hebrew step labels.

- [ ] **Commit**

```bash
git add apps/vendor/src/components/store-setup/store-setup.tsx
git commit -m "fix: translate vendor store-setup widget to Hebrew"
```

---

## Task 4: Block raw Medusa admin (/app/) and redirect to Mercur panel

**Files:**
- Modify: `apps/api/medusa-config.ts` (verify `disable: true` for admin)
- Modify: `apps/api/src/api/middlewares.ts` (add redirect route, create if not exists)

**Problem:** Medusa's default admin at `/app/` must remain disabled. Any user who navigates to `/app/` or `/app/*` should be redirected to `/dashboard/` (the Mercur admin). This prevents confusion from accessing an incomplete raw Medusa UI.

### Step 4a: Verify admin is disabled in medusa-config

- [ ] **Read medusa-config**

```bash
grep -n 'admin\|disable' /Users/hadashamerovv/Documents/Coding/bookshook-marketplace/apps/api/medusa-config.ts | head -20
```

Expected: `disable: true` inside the admin config block. If missing, add it.

If missing, add to the `modules` / `admin` section:
```typescript
// In medusa-config.ts, inside defineConfig:
admin: {
  disable: true,
},
```

### Step 4b: Add redirect middleware for /app/ routes

- [ ] **Check if middlewares file exists**

```bash
ls /Users/hadashamerovv/Documents/Coding/bookshook-marketplace/apps/api/src/api/
```

- [ ] **Add or extend middlewares.ts to redirect /app/ → /dashboard/**

If `apps/api/src/api/middlewares.ts` does not exist, create it. If it exists, add to it.

```typescript
// apps/api/src/api/middlewares.ts
import type { MiddlewaresConfig } from "@medusajs/framework/http"
import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework"

export const config: MiddlewaresConfig = {
  routes: [
    {
      matcher: "/app*",
      middlewares: [
        (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
          // Redirect legacy Medusa admin to Mercur admin
          const suffix = req.path.replace(/^\/app/, "") || "/"
          res.redirect(301, `/dashboard${suffix}`)
        },
      ],
    },
  ],
}
```

- [ ] **Rebuild and restart medusa**

```bash
docker compose restart medusa
# Wait ~30s
curl -I http://localhost:9000/app/
# Expected: HTTP/1.1 301, Location: /dashboard/
```

- [ ] **Commit**

```bash
git add apps/api/src/api/middlewares.ts apps/api/medusa-config.ts
git commit -m "fix: redirect /app/* to /dashboard/ to block raw Medusa admin access"
```

---

## Task 5: Implement checkout page

**Files:**
- Create: `apps/storefront/src/app/checkout/page.tsx`
- Modify: `apps/storefront/src/app/cart/page.tsx:87`

**Problem:** The cart page has a "מעבר לתשלום" button with no action — clicking it does nothing. No checkout page exists. The buying process cannot complete.

**Approach:** Checkout page collects shipping address, lets user pick a shipping method (seeded: Standard 10₪ / Express 25₪), then calls `sdk.store.cart.complete()` with the system payment provider.

### Step 5a: Wire up the cart button

- [ ] **In `apps/storefront/src/app/cart/page.tsx` replace the plain button with a Link:**

```tsx
import Link from "next/link"

// Replace:
<button className="mt-4 w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors">
  מעבר לתשלום
</button>

// With:
<Link
  href="/checkout"
  className="mt-4 block w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors text-center"
>
  מעבר לתשלום
</Link>
```

### Step 5b: Create the checkout page

- [ ] **Create `apps/storefront/src/app/checkout/page.tsx`**

```tsx
"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/context/cart"
import { sdk } from "@/lib/client-sdk"
import { formatPrice } from "@/lib/utils"

type ShippingOption = { id: string; name: string; amount: number }

export default function CheckoutPage() {
  const { cart, setCart } = useCart()
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [selectedShipping, setSelectedShipping] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState<"address" | "shipping" | "confirm">("address")

  useEffect(() => {
    if (!cart) return
    sdk.store.fulfillment.listCartOptions({ cart_id: cart.id })
      .then((res: any) => {
        const opts: ShippingOption[] = (res.shipping_options || []).map((o: any) => ({
          id: o.id,
          name: o.name,
          amount: o.amount ?? 0,
        }))
        setShippingOptions(opts)
        if (opts.length > 0) setSelectedShipping(opts[0].id)
      })
      .catch(() => {})
  }, [cart])

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <p className="text-gray-500">הסל שלך ריק.</p>
      </div>
    )
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await sdk.store.cart.update(cart.id, {
        email,
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          address_1: address,
          city,
          country_code: "il",
          phone,
        },
        billing_address: {
          first_name: firstName,
          last_name: lastName,
          address_1: address,
          city,
          country_code: "il",
          phone,
        },
      })
      setStep("shipping")
    } catch {
      setError("שגיאה בשמירת הכתובת, נסה שוב")
    } finally {
      setLoading(false)
    }
  }

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await sdk.store.cart.addShippingMethod(cart.id, {
        option_id: selectedShipping,
      })
      setStep("confirm")
    } catch {
      setError("שגיאה בבחירת משלוח, נסה שוב")
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceOrder = async () => {
    setLoading(true)
    setError("")
    try {
      // Initiate payment session with system provider
      await (sdk.store as any).payment.initiatePaymentSession(cart, {
        provider_id: "pp_system_default",
      })
      // Complete the cart → creates the order
      const { type, order } = await sdk.store.cart.complete(cart.id) as any
      if (type === "order" && order?.id) {
        setCart(null)
        router.push(`/order-confirmation?id=${order.id}`)
      } else {
        setError("שגיאה בהשלמת ההזמנה, בדוק את הפרטים ונסה שוב")
      }
    } catch {
      setError("שגיאה בביצוע ההזמנה, נסה שוב")
    } finally {
      setLoading(false)
    }
  }

  const selectedOption = shippingOptions.find(o => o.id === selectedShipping)

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">תשלום</h1>

      {/* Progress */}
      <div className="flex gap-2 mb-8 text-sm">
        {(["address", "shipping", "confirm"] as const).map((s, i) => (
          <span key={s} className={`font-medium ${step === s ? "text-amber-600" : "text-gray-400"}`}>
            {i + 1}. {s === "address" ? "כתובת" : s === "shipping" ? "משלוח" : "אישור"}
          </span>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>}

      {step === "address" && (
        <form onSubmit={handleAddressSubmit} className="space-y-4 bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">כתובת למשלוח</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם פרטי</label>
              <input required value={firstName} onChange={e => setFirstName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם משפחה</label>
              <input required value={lastName} onChange={e => setLastName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">כתובת</label>
            <input required value={address} onChange={e => setAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">עיר</label>
            <input required value={city} onChange={e => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50">
            {loading ? "שומר..." : "המשך לבחירת משלוח ←"}
          </button>
        </form>
      )}

      {step === "shipping" && (
        <form onSubmit={handleShippingSubmit} className="space-y-4 bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">שיטת משלוח</h2>
          {shippingOptions.length === 0 ? (
            <p className="text-gray-500 text-sm">טוען אפשרויות משלוח...</p>
          ) : (
            shippingOptions.map(opt => (
              <label key={opt.id} className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-amber-50">
                <input type="radio" name="shipping" value={opt.id}
                  checked={selectedShipping === opt.id}
                  onChange={() => setSelectedShipping(opt.id)}
                  className="accent-amber-500" />
                <span className="flex-1 text-sm font-medium text-gray-900">{opt.name}</span>
                <span className="text-sm text-gray-600">{formatPrice(opt.amount)}</span>
              </label>
            ))
          )}
          <button type="submit" disabled={loading || !selectedShipping}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50">
            {loading ? "שומר..." : "המשך לאישור ←"}
          </button>
        </form>
      )}

      {step === "confirm" && (
        <div className="space-y-4 bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">סיכום הזמנה</h2>
          <div className="space-y-2 text-sm">
            {cart.items.map((item: any) => (
              <div key={item.id} className="flex justify-between text-gray-700">
                <span>{item.title} × {item.quantity}</span>
                <span>{formatPrice(item.unit_price * item.quantity)}</span>
              </div>
            ))}
            {selectedOption && (
              <div className="flex justify-between text-gray-700 border-t pt-2 mt-2">
                <span>משלוח ({selectedOption.name})</span>
                <span>{formatPrice(selectedOption.amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 border-t pt-2 mt-2">
              <span>סה"כ</span>
              <span>{formatPrice(cart.total, cart.currency_code)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">תשלום: מזומן/צ'ק בעת קבלה</p>
          <button onClick={handlePlaceOrder} disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
            {loading ? "מבצע הזמנה..." : "אשר הזמנה"}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Add `setCart` to CartContext** — the checkout page calls `setCart(null)` after order completion. Verify `useCart()` exposes `setCart`. If not, expose it.

Open `apps/storefront/src/context/cart.tsx`. If `setCart` is not in the context type, add it:
```typescript
// In CartContextType, add:
setCart: (cart: Cart | null) => void

// In CartProvider, expose it:
<CartContext.Provider value={{ cart, setCart, itemCount, addItem, removeItem, updateItem, loading }}>
```

- [ ] **Create order confirmation page** at `apps/storefront/src/app/order-confirmation/page.tsx`:

```tsx
"use client"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

function ConfirmationInner() {
  const params = useSearchParams()
  const orderId = params.get("id")

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">ההזמנה בוצעה בהצלחה!</h1>
      <p className="text-gray-500 mb-6">תקבל עדכון כשהספרים ישלחו.</p>
      {orderId && <p className="text-xs text-gray-400 mb-6">מס' הזמנה: {orderId}</p>}
      <Link href="/account" className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-6 rounded-lg transition">
        לחשבון שלי
      </Link>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationInner />
    </Suspense>
  )
}
```

- [ ] **Commit**

```bash
git add apps/storefront/src/app/checkout/page.tsx \
        apps/storefront/src/app/order-confirmation/page.tsx \
        apps/storefront/src/app/cart/page.tsx \
        apps/storefront/src/context/cart.tsx
git commit -m "feat: implement checkout flow with address, shipping, and order placement"
```

---

## Task 6: Verify cart context exposes setCart

**Files:**
- Modify: `apps/storefront/src/context/cart.tsx` (if needed)

- [ ] **Read current cart context type**

Open `apps/storefront/src/context/cart.tsx` and check the `CartContextType`. If `setCart` is already exported, skip this task. If not, add it to type and provider value.

---

## Task 7: Manual verification — admin login and functionality

No code change. Verification checklist.

- [ ] **Open** http://localhost:9000/dashboard
- [ ] **Log in** with admin@bookshook.com / Admin123!
- [ ] **Confirm** the sidebar shows "בוקשוק - ניהול" as the app name
- [ ] **Confirm** the store name in Settings → Store shows "BookShook"
- [ ] **Confirm** the currency list shows only ILS (₪)
- [ ] **Confirm** the region list shows only "ישראל"
- [ ] **Confirm** the Sellers/Vendors list is accessible (the Mercur sellers widget)
- [ ] **Confirm** orders appear in the Orders section

---

## Task 8: Manual verification — vendor login and order tracking

No code change. Verification checklist.

- [ ] **Open** http://localhost:7001
- [ ] **Log in** as seller@bookshook.com / Vendor123
- [ ] **Confirm** the app name shows "בוקשוק" (set in vite.config)
- [ ] **Confirm** the BookShook logo is visible and not clipped
- [ ] **Confirm** the store setup widget now shows Hebrew step labels (from Task 3)
- [ ] **Confirm** the Orders section is accessible and shows any test orders
- [ ] **Confirm** order status can be updated (mark as "shipped" etc.)

If the vendor panel shows "Medusa Store" anywhere in its built-in `@mercurjs/vendor` UI (the package's own pages that cannot be easily overridden), note it — these are upstream package strings and require a package fork or patch.

---

## Task 9: Manual verification — buyer registration, login, and purchase

No code change. Verification checklist.

### 9a: New buyer sign-up and purchase

- [ ] **Open** http://localhost:8000/register
- [ ] **Register** a new user (e.g. test@example.com) — do NOT check "אני גם רוצה למכור ספרים"
- [ ] **Confirm** redirected to /account after registration
- [ ] **Navigate** to home page — confirm books appear (The Great Gatsby, A Brief History of Time)
- [ ] **Click** a book — open product detail (if product detail page exists) or add to cart from list
- [ ] **Add to cart** — confirm cart count increments in nav
- [ ] **Open** http://localhost:8000/cart — confirm item appears with ₪ price
- [ ] **Click** "מעבר לתשלום" — confirm navigates to /checkout
- [ ] **Fill** shipping address form — confirm continues to shipping step
- [ ] **Select** shipping option — confirm Standard or Express shown in ₪
- [ ] **Click** "אשר הזמנה" — confirm order confirmation page
- [ ] **Open** /account → ההזמנות שלי — confirm order appears with Hebrew status

### 9b: New user sign-up as seller

- [ ] **Open** http://localhost:8000/register
- [ ] **Register** a new user and CHECK "אני גם רוצה למכור ספרים"
- [ ] **Confirm** redirected to http://localhost:7001/onboarding after registration
- [ ] **Complete** onboarding steps in vendor panel

### 9c: Existing buyer switching to seller tab

- [ ] **Log in** as an existing buyer at /login
- [ ] **Open** /account — confirm "קונה" and "מוכר" tabs are visible
- [ ] **Click** "מוכר" tab — confirm "כניסה לממשק המוכר" button appears
- [ ] **Click** the button — confirm opens http://localhost:7001

---

## Task 10: Verify ILS-only and Israel-only in admin

No code change. Verification checklist.

- [ ] **Admin** → Settings → Store → Currencies: only "ILS - Israeli New Shekel" should be listed
- [ ] **Admin** → Settings → Regions: only "ישראל" should be listed with country "Israel"
- [ ] **Storefront** cart and product prices show ₪ symbol (not $, €, etc.)
- [ ] **Storefront** checkout shipping options show ₪ amounts

If any non-ILS currency or non-Israel region appears, run the seed again:
```bash
docker compose exec medusa sh -c "cd /app/apps/api/.medusa/server && npx medusa exec ./src/scripts/seed.js"
```

---

## Task 11: Verify complete Hebrew coverage and BookShook branding

No code change. Verification checklist.

### Storefront (http://localhost:8000)
- [ ] Nav: "התחברות", "החשבון שלי" — Hebrew ✓ (already implemented)
- [ ] Home page heading: "כל הספרים" — Hebrew ✓
- [ ] Login page: "התחברות לבוקשוק" — Hebrew ✓
- [ ] Register page: "הרשמה לבוקשוק" — Hebrew ✓
- [ ] Cart page: "סל הקניות", "סה\"כ", "מעבר לתשלום" — Hebrew ✓
- [ ] Checkout page: Hebrew labels — from Task 5 ✓
- [ ] No English text visible to users anywhere

### Admin panel (http://localhost:9000/dashboard)
- [ ] App title: "בוקשוק - ניהול" (set in vite.config) — verify in browser tab
- [ ] Logo: BookShook logo visible (set in vite.config)
- [ ] Store name: "BookShook" (from Task 2 seed fix)
- [ ] The Mercur admin sidebar uses "מוכרים" for the sellers section (previously fixed)
- [ ] Note: The Medusa admin's built-in menu labels (Products, Orders, Customers) are in English from the `@medusajs/dashboard` package — this is expected and cannot be changed without forking the package

### Vendor panel (http://localhost:7001)
- [ ] App title: "בוקשוק" (set in vite.config) — verify in browser tab
- [ ] Logo: BookShook logo visible
- [ ] Store setup widget: Hebrew labels (from Task 3)
- [ ] Note: The main vendor navigation (Products, Orders, Settings menu items) comes from `@mercurjs/vendor` package. If those menu items are in English, they require a package fork — document them but do not block release on package-level strings

---

## Task 12: Verify /app/ redirect is working

Verification of Task 4.

- [ ] **In browser**, navigate to http://localhost:9000/app/
- [ ] **Confirm** browser redirects to http://localhost:9000/dashboard/
- [ ] **In browser**, navigate to http://localhost:9000/app/products
- [ ] **Confirm** browser redirects to http://localhost:9000/dashboard/products

---

## Self-Review

**Spec coverage check:**
- Admin login and functionalities → Task 7 ✓
- Vendor login → Task 8 ✓
- ILS only / Israel only → Tasks 2, 10 ✓
- Buyer login and profile → Task 9c ✓
- New user sign up as buyer and seller → Task 9a, 9b ✓
- Books appear in storefront → Task 9a ✓
- Complete buying process → Task 5, 9a ✓
- Vendor order tracking → Task 8 ✓
- Hebrew menus → Task 11 ✓
- BookShook branding everywhere → Tasks 2, 3, 7, 11 ✓
- Logo visible and not trimmed → Task 1 ✓
- Block Medusa panels / redirect → Task 4 ✓

**No placeholders.** All steps include exact commands, file paths, and code.

**Type consistency:** `setCart` added to CartContextType in Task 6 is consumed in Task 5's checkout page. The type name `Cart` in the context must match the existing cart shape — if the context uses a different type name, update the checkout page accordingly.
