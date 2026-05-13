# UI Review — bookshook Storefront (feature/bookshook-ux-overhaul)

**Audited:** 2026-05-12
**Scope:** Storefront (Next.js 14) + vendor/admin HTML shells
**Baseline:** Abstract 6-pillar standards (no UI-SPEC)
**Screenshots:** Not captured — dev server at port 8000 responded but Playwright not available; code-only audit

## Overall Score: 17/24

| Pillar | Score | Verdict |
|--------|-------|---------|
| Copywriting | 3/4 | Strong Hebrew localization, minor arrow direction issue and emoji-in-instructions problem |
| Visuals | 2/4 | No hero/focal point on homepage, emoji icons in production UI, no seller attribution on product cards |
| Color | 2/4 | Amber-500 used correctly as accent; gray-900 competes as a second primary; blue-400 leaks into search ring |
| Typography | 3/4 | 7 distinct font sizes in use (exceeds 4-size budget), 3 weights — functional but unscaled |
| Spacing | 3/4 | Mostly consistent Tailwind scale; py-24 on empty states is heavy; no arbitrary values — clean |
| Experience Design | 4/4 | Strong: loading/error/empty states covered, multi-step checkout with step indicator, wishlist with persistence |

---

## Pillar 1: Copywriting — 3/4

### Findings

**PASS — Hebrew localization is thorough.** All user-visible strings are in Hebrew across every page. Error messages are specific and actionable (register/page.tsx:40-43). Auth state labels ("מתחבר...", "נרשם...") exist.

**WARNING — LTR arrow in RTL context.** Three instances use `←` (left-pointing arrow) in Hebrew CTAs:
- `checkout/page.tsx:170` — "המשך לבחירת משלוח ←"
- `checkout/page.tsx:194` — "המשך לאישור ←"
- `account/page.tsx:145` — "הצטרפות כמוכר ←"

In RTL, forward progression is right-to-left; `←` signals "go back." The correct forward arrow for Hebrew is `→` (or a chevron-right icon).

**WARNING — Emoji embedded in instructional copy.** `account/page.tsx:53` reads: `לחץ על ❤️ בכרטיס ספר כדי לשמור.` — the instruction references a visual emoji by rendering the emoji inline. If the emoji rendering changes (OS, accessibility mode, screen reader), the instruction becomes confusing. Use a text description instead.

**WARNING — Gender assumption in instruction.** `account/page.tsx:53` uses `לחץ` (masculine imperative). A gender-neutral form (`לחצו` plural or rephrasing) would be more inclusive.

**PASS — Empty states have copy.** Both cart (cart/page.tsx:14-15) and product search (searchable-product-list.tsx:42-44) have distinct messages for empty vs. no-results states.

**PASS — Loading states have Hebrew copy.** "טוען...", "מוסיף...", "שומר...", "מבצע הזמנה..." are all present.

### Recommendations

1. Replace `←` with `→` in all three CTA locations.
2. Rewrite `account/page.tsx:53` to not embed emoji in instructional text; use an icon component with accessible label instead.
3. Standardize gender-neutral imperatives across copy.

---

## Pillar 2: Visuals — 2/4

### Findings

**BLOCKER — No hero / focal point on homepage.** `app/page.tsx` renders only `<h1>כל הספרים</h1>` followed directly by the product grid. There is no banner, value proposition section, or visual hook. For a marketplace homepage, this makes the brand invisible above the fold.

**WARNING — Emoji used as production icons in account page.** `account/page.tsx:124` uses `📚` as a section icon and `account/page.tsx:63` uses `✕` (Unicode multiplication sign, not a proper close icon) as a remove button. `product-card.tsx:72` uses `❤️`/`🤍` as wishlist toggle icons. Emoji rendering is OS-dependent — they will look different across Android, iOS, Windows, and macOS. An icon library (e.g. `@medusajs/icons` already in the monorepo) would guarantee consistent rendering.

**WARNING — No seller attribution on product cards.** This is a multi-vendor marketplace; buyers cannot tell which seller is selling a book from the product card or listing page. The product card (`product-card.tsx`) and product detail page (`products/[handle]/page.tsx`) show no vendor name. This is a core marketplace differentiator missing from the UI.

**WARNING — Empty product thumbnail fallback is text.** Both `product-card.tsx:62-64` and `products/[handle]/page.tsx:44-46` show "אין תמונה" as text inside a gray box. A placeholder illustration or book-spine icon would communicate the missing state more clearly.

**PASS — Cart icon has item count badge.** `nav.tsx:44-48` correctly shows a count badge on the cart icon.

**PASS — Wishlist heart has hover scale animation.** `product-card.tsx:70` uses `hover:scale-110 transition-transform` — micro-interaction is present.

**PASS — Add-to-cart shows confirmation state.** `add-to-cart.tsx:22` shows "נוסף לסל ✓" for 2 seconds after adding — good feedback.

### Recommendations

1. Add a homepage hero section with brand tagline and a featured books strip above the grid.
2. Replace emoji icons (`📚`, `❤️`, `🤍`, `✕`) with `@medusajs/icons` or SVG equivalents for cross-platform consistency.
3. Display seller name on product cards and product detail page.

---

## Pillar 3: Color — 2/4

### Findings

**WARNING — Two competing "action" colors.** The primary CTA throughout auth and checkout forms uses `bg-amber-500`. But cart/page.tsx and add-to-cart.tsx use `bg-gray-900` for their primary action buttons ("מעבר לתשלום", "הוסף לסל"). This creates two distinct primary action colors with no semantic distinction between them. Users will not know which color signals "primary action."

- amber-500 usage: 31 instances (login, register, checkout steps 1+2, confirmation link, account page)
- gray-900 usage as action color: 4 instances (cart checkout button, add-to-cart button, confirm order button)

**BLOCKER — Off-brand focus ring in search.** `searchable-product-list.tsx:36` uses `focus:ring-2 focus:ring-blue-400`. Every other interactive element in the storefront uses `focus:ring-amber-400`. This blue ring appears only on the most prominent interaction target on the homepage (the search field) and directly contradicts the established amber palette.

**WARNING — Cart badge uses gray-900.** `nav.tsx:45` — the cart item count badge is `bg-gray-900`, making it look more like a decorative element than a notification. A semantic accent color (amber-600 or a red badge) would signal "attention."

**PASS — Error states use red consistently.** `bg-red-50 text-red-700` pattern used in login, register, checkout error divs — semantically correct.

**PASS — Order status badges use semantic colors.** `account/page.tsx:102-106` — completed=green, cancelled=red, pending/processing=amber. Correct.

**PASS — No hardcoded hex or rgb() values found** anywhere in TSX files.

### Recommendations

1. Standardize all primary action buttons to `bg-amber-500 hover:bg-amber-600` — replace `bg-gray-900` on "הוסף לסל", "מעבר לתשלום", and "אשר הזמנה".
2. Fix search focus ring from `focus:ring-blue-400` to `focus:ring-amber-400` in `searchable-product-list.tsx:36`.
3. Change cart badge from `bg-gray-900` to `bg-amber-500` or `bg-red-500`.

---

## Pillar 4: Typography — 3/4

### Findings

**WARNING — 7 distinct font sizes in use.** Audit found: `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-5xl` — 8 size tokens total (text-3xl and text-5xl each appear once). Abstract standard recommends ≤4 sizes for tightly scoped UIs. The `text-5xl` on the order confirmation emoji (order-confirmation/page.tsx:12) and `text-3xl` for the homepage h1 (page.tsx:20) are edge-use sizes that could be collapsed.

**PASS — 3 font weights: medium, semibold, bold.** This is reasonable and intentional — labels use medium, UI text uses semibold, headings use bold.

**PASS — Heebo font loaded for RTL Hebrew.** `globals.css:5` imports Heebo via Google Fonts — appropriate choice for Hebrew text rendering.

**WARNING — Inconsistent heading levels.** Homepage uses `text-3xl` for h1 (page.tsx:20), but product detail and auth pages use `text-2xl` for h1 (products/[handle]/page.tsx:51, login/page.tsx:33). The top-level page heading has no consistent size token.

**WARNING — Price on product detail page is `text-xl text-gray-700`.** Price is a key decision variable; visually it should be at least as prominent as the title (`text-2xl`), not subordinate to it.

### Recommendations

1. Define 4 canonical sizes: `text-sm` (metadata), `text-base` (body), `text-lg` (section headers), `text-2xl` (page titles). Eliminate `text-3xl`, `text-5xl` from functional content — use them only for decorative elements.
2. Standardize all page-level h1 elements to `text-2xl font-bold`.
3. Elevate product price on detail page from `text-xl text-gray-700` to `text-2xl font-bold text-gray-900` to match visual hierarchy expectations.

---

## Pillar 5: Spacing — 3/4

### Findings

**PASS — All spacing uses Tailwind scale tokens.** No arbitrary `[px]` or `[rem]` values found anywhere in storefront TSX files.

**WARNING — Empty state vertical padding is excessive.** Cart empty state (`cart/page.tsx:13`) and checkout empty state (`checkout/page.tsx:43`) use `py-24` (96px). This creates a very tall blank area before any content. `py-16` is the standard for centered empty states.

**WARNING — Nav height is `h-24` (96px) with a logo `h-20`.** This is an unusually tall nav — for a marketplace storefront, `h-16` is more standard. The nav's tagline text ("הופכים את ספרים לזהב") stacks below the logo inside the nav, compressing the content area unnecessarily.

**WARNING — Inconsistent inner card padding.** Form cards use `p-8` (login) vs `p-6` (checkout steps, account seller tab) vs `p-4` (cart items, orders list). No clear rule for which card context gets which padding.

**PASS — Gap scale is consistent.** Form grids use `gap-3`, product grids use `gap-6`, internal spacing uses `gap-2/3/4` — this is internally coherent.

**PASS — Horizontal padding is consistent at `px-4` with `max-w-*` containers across all pages.**

### Recommendations

1. Reduce empty state `py-24` to `py-16` on cart and checkout pages.
2. Reduce nav height from `h-24` to `h-16`; move tagline out of nav or remove it.
3. Standardize card inner padding: `p-6` for form/content cards, `p-4` for list item cards.

---

## Pillar 6: Experience Design — 4/4

### Findings

**PASS — Multi-step checkout with step indicator.** `checkout/page.tsx:123-129` renders a step breadcrumb ("כתובת", "משלוח", "אישור") with active state highlighting. The 3-step flow is complete end-to-end.

**PASS — Loading states present on all async actions.** Every button that triggers an async call (login, register, add-to-cart, checkout steps, order placement) shows a Hebrew loading label and disables the button via `disabled={loading}`.

**PASS — Error states present on all forms.** All form pages display a styled `bg-red-50 text-red-700` error div when submission fails. Register errors distinguish between "already registered", "invalid", and generic failure (register/page.tsx:40-47).

**PASS — Empty states exist for all lists.** Cart, order list, wishlist, and product search all have distinct empty state copy.

**PASS — Auth guard on account page.** `account/page.tsx:157-161` redirects to `/login` if no customer is present after loading.

**PASS — Wishlist persistence via localStorage.** Product-level wishlist toggle with localStorage persistence and cross-page consistency between ProductCard and AccountPage.

**PASS — Order confirmation page.** Orders redirect to `/order-confirmation?id=...` with the order ID displayed, plus a link back to account.

**WARNING (minor) — Suspense fallback on order confirmation is `null`.** `order-confirmation/page.tsx:25` uses `<Suspense fallback={null}>`. If useSearchParams is slow, the page renders nothing instead of a skeleton. Low-risk but should be a loading spinner.

**WARNING (minor) — No back navigation from checkout steps.** Once the user advances from "address" to "shipping" to "confirm", there is no "חזרה" button to go back to the prior step. The step indicator is read-only.

**WARNING (minor) — Cart remove button has no confirmation.** Removing an item from the cart (`cart/page.tsx:69-75`) is instant with no undo or confirmation. Acceptable for a book marketplace but worth noting.

**WARNING (minor) — `text-left` in RTL page.** `account/page.tsx:101` uses `className="text-left"` on an order row's price/status column. In `dir="rtl"`, `text-left` pushes text to the physical left side (which is the logical "end" in RTL), but it can behave unexpectedly across browsers. Prefer `text-start`/`text-end` logical properties.

### Recommendations

1. Add a "חזרה" back button on checkout shipping and confirm steps.
2. Replace `text-left` with `text-start` in RTL context (`account/page.tsx:101`).
3. Add a loading spinner as Suspense fallback on order confirmation page.

---

## Top 5 Priority Fixes

1. **[BLOCKER] Fix off-brand blue focus ring on search field** (`searchable-product-list.tsx:36`) — Changes `focus:ring-blue-400` to `focus:ring-amber-400`. Every user who tabs to the search bar or clicks into it sees a blue ring that breaks the amber palette. One-line fix, high visibility.

2. **[BLOCKER] Unify primary action button color to amber-500** — `cart/page.tsx:19` ("המשך קניות"), `cart/page.tsx:89` ("מעבר לתשלום"), `add-to-cart.tsx:18` ("הוסף לסל"), `checkout/page.tsx:222` ("אשר הזמנה") all use `bg-gray-900`. The most important user actions in the purchase funnel have a different color than the rest of the UI. Change to `bg-amber-500 hover:bg-amber-600`.

3. **[WARNING] Fix LTR arrows in RTL CTAs** — `checkout/page.tsx:170,194` and `account/page.tsx:145` use `←` to mean "proceed forward." In Hebrew RTL, this arrow means "go back." Replace with `→` or a Chevron-Right icon. Users following these arrows will feel disoriented.

4. **[WARNING] Add seller attribution to product card and detail page** — Multi-vendor marketplace without seller name on any product surface. Add seller name (or store name) below the title on `product-card.tsx` and `products/[handle]/page.tsx`. Requires passing seller data from the API, which already returns vendor info via Mercur.

5. **[WARNING] Add a homepage hero section** — The homepage is a raw product grid with a single `<h1>כל הספרים</h1>`. No brand value proposition, no featured books, no trust signals. Add a minimal hero block (tagline + search bar + featured category chips) above the grid to establish brand context for first-time buyers.

---

## Files Audited

**Storefront**
- `apps/storefront/src/app/page.tsx`
- `apps/storefront/src/app/layout.tsx`
- `apps/storefront/src/app/globals.css`
- `apps/storefront/src/app/login/page.tsx`
- `apps/storefront/src/app/register/page.tsx`
- `apps/storefront/src/app/account/page.tsx`
- `apps/storefront/src/app/cart/page.tsx`
- `apps/storefront/src/app/checkout/page.tsx`
- `apps/storefront/src/app/order-confirmation/page.tsx`
- `apps/storefront/src/app/products/[handle]/page.tsx`
- `apps/storefront/src/app/products/[handle]/add-to-cart.tsx`
- `apps/storefront/src/components/nav.tsx`
- `apps/storefront/src/components/product-card.tsx`
- `apps/storefront/src/components/searchable-product-list.tsx`
- `apps/storefront/src/context/auth.tsx`
- `apps/storefront/src/context/cart.tsx`

**Vendor / Admin (shells)**
- `apps/vendor/src/components/store-setup/store-setup.tsx`
- `packages/vendor/src/components/onboarding-wizard/onboarding-wizard.tsx`
- `packages/vendor/src/pages/store-select/store-select.tsx`

**Registry audit:** shadcn not initialized — skipped.
