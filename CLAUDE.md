# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Single-page storefront for "Gregori Joyería" (a Colombian jewelry business). It is a **pure static site** — no build step, no package manager, no framework. It runs entirely in the browser using ES modules, Tailwind via CDN, and Firebase Firestore for live product data.

## Running / Developing

There is no build, lint, or test tooling. Because `assets/js/app.js` is loaded as an ES module (`<script type="module">`) and uses `import.meta.url`, opening `index.html` via `file://` will fail — it must be served over HTTP:

```bash
python -m http.server 8000      # then open http://localhost:8000
# or: npx serve
```

Firebase runs against the live `gregori-joyeria` project (config is inlined in `assets/js/app.js`); there is no local emulator setup. Any product add/edit/delete in the admin panel writes to the real Firestore `products` collection.

## Architecture

The entire application lives in **`assets/js/app.js`** (~1650 lines, no modules split out). It is a hand-rolled reactive SPA built on three ideas:

1. **Single `state` object** — the source of truth (active tab, filters, cart, admin auth, `products` array, selected product, editing id). There is no framework; rendering is manual.

2. **String-template rendering into fixed DOM slots.** `index.html` provides empty containers (`#app-content`, `#product-modal`, `#desktop-menu`, `#toast-container`, `#floating-cart-fab`). Render functions build HTML strings and assign them via `innerHTML`.
   - `renderApp()` — renders the active tab's whole view into `#app-content`. Tabs: `inicio`, `catalogo`, `carrito`, `favoritos`, `nosotros`, `trabaja`, `contacto`, plus the hidden `admin`. The text nav menu is driven by `NAV_LINKS`/`NAV_LABELS` (a curated subset — `carrito` and `favoritos` are icon-only, `admin` is hidden).
   - `renderNav()` — rebuilds desktop + mobile nav (with cart + wishlist count badges) and the floating cart button.
   - `openModal()` / `closeModal()` — product detail overlay in `#product-modal`.
   - `navigate(tab)` sets `state.activeTab` and calls `renderNav()` + `renderApp()`.

3. **`onClick="fn(...)"` handlers in the HTML strings.** Because the module scope is not global, every handler used in markup must be re-exported via the `Object.assign(window, {...})` block near the bottom of the file. **If you add a new function referenced from an `onclick`/`oninput`/`onsubmit` attribute, you must add it to that block or it will throw "not defined" at runtime.**

### Firebase / real-time sync

`onSnapshot(collection(db, "products"))` is the live data pipeline. On every Firestore change it re-maps `state.products` through `normalizeProductRecord`, re-sorts by `timestamp` desc, and does **targeted "smart updates"** (patching only the relevant grid/table/modal) rather than a full `renderApp()` — this avoids flicker when another device edits data. The first snapshot does a full render (`isFirstLoad`). If you add a new data-dependent view, wire it into this smart-update `if/else` chain in the `onSnapshot` callback.

Admin CRUD uses `addDoc` / `updateDoc` / `deleteDoc`; the UI does not manually refresh after writes — it relies on the snapshot listener to push the change back. `seedInitialData()` loads `INITIAL_PRODUCTS` into an empty collection.

### Data normalization

Product data from Firestore is untrusted/inconsistent, so several helpers defensively normalize it — reuse these rather than reading raw fields:
- `normalizeProductRecord` — canonicalizes `material` (legacy "Oro" → "Oro laminado"), parses price, dedupes images into an `images[]` array with `image` as the cover.
- `parsePriceToNumber` / `formatPriceCOP` — handle messy price strings and format as Colombian pesos (`Intl.NumberFormat('es-CO')`).
- `normalizeImageUrl` — rewrites Dropbox/Imgur share links to direct URLs and injects `f_auto,q_auto` into Cloudinary URLs.
- `getProductImages` / `getPrimaryProductImage` — always go through these for images; they fall back to a generated SVG placeholder (`createPlaceholderImage`) and `handleImageError` provides runtime retry + placeholder fallback.

### Admin auth

The admin panel is reached via the hidden lock icon in the footer (`navigate('admin')`). Auth is **client-side only** (not real security): the expected password is stored Base64-obfuscated, hashed with SHA-256 via `crypto.subtle` at load, and compared against the login input's hash in `handleLogin`. Anyone reading the source can recover it. Do not treat this as a security boundary.

### Cart, wishlist & WhatsApp checkout

There is no payment backend. The cart (`state.cart`, id + quantity) and wishlist (`state.wishlist`, array of ids) are persisted to `localStorage` under `STORAGE_KEYS` via `persistCart()` / `persistWishlist()` — call these after any mutation. `loadPersistedState()` restores them on boot, and `syncCartWithProducts()` prunes both against the live Firestore product set on every snapshot. Checkout, product inquiries, job applications, and the contact form (`handleContactForm`) all funnel into WhatsApp deep links (`https://wa.me/${WHATSAPP_NUMBER}?text=...`). `WHATSAPP_NUMBER` is a constant at the top of `app.js`.

Wishlist toggles use `updateWishlistButtons(id)` to patch only the affected heart buttons (`[data-wishlist-id]`) in place rather than re-rendering — mirror this pattern for other in-place state reflections.

## Styling

- **Tailwind via CDN** (`cdn.tailwindcss.com`) configured at runtime in `assets/js/tailwind-config.js`, which defines the design tokens: a `gold` scale (DEFAULT champagne `#C6A15B`, plus `.light`/`.dark`/`.deep`/`50`/`100`), warm neutrals (`ivory`, `cream`, `sand`, `ink`, `charcoal`), custom shadows (`shadow-luxe`, `shadow-gold`), letter-spacing (`tracking-luxe`, `tracking-wide2`), and animations (`animate-fade-up`, `animate-ken-burns`). Use these tokens rather than raw hex/zinc values. **Gold buttons use dark text (`text-ink`), not white** — the champagne gold is too light for white text contrast.
- `assets/css/styles.css` holds what utilities can't express: the `.reveal` scroll-in system, `.gold-rule`, `.img-skeleton` shimmer, the `.marquee` gold ticker, cart animations (`.cart-fly-img` fly-to-cart clone + `.cart-bump` badge pulse), `.modal-swap-in` (product switch inside the modal), focus-visible rings, product zoom, toasts, and a `prefers-reduced-motion` block.
- **Cart fly animation:** `addToCart(id, event)` takes the click event; `flyImageToCart` clones the nearest `article img` (or `#product-main-image` in the modal) and animates it to the first visible `[data-cart-target]` element (nav cart buttons + FAB carry that attribute), then pulses `.cart-count-badge` elements. Keep the attribute/class when touching those buttons.
- **Modal product switch:** `openModal` detects an already-open modal (related-product clicks), wraps content with `.modal-swap-in`, smooth-scrolls the modal to top with an instant fallback after 650ms.
- **Scroll reveal:** add `class="reveal"` (optionally `reveal-delay-1..4`) to any element; `applyScrollReveal()` (called at the end of `renderApp`) wires an `IntersectionObserver` that adds `.is-visible`. New views should tag major blocks with `reveal` for consistency.
- The design language is luxury/editorial: warm ivory base, refined champagne gold, dramatic `ink` (near-black) hero/footer/section bands, Playfair serif headings with uppercase tracked eyebrows. Content and UI copy are in **Spanish**.

## Conventions

- Always `escapeHtml()` any user/DB-provided string before interpolating it into a template literal that becomes `innerHTML`.
- Prices are integers (COP) internally; format for display only at the edges via `formatPriceCOP`.
- New user-facing handlers referenced from inline HTML attributes **must** be added to the `Object.assign(window, {...})` export block.
