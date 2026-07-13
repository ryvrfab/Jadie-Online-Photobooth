# jadie — photobooth for long distance couples

A single-page, no-backend web app. Everything (camera, real-time room sync via
Firebase, canvas photo editor, exports, sharing, PWA, analytics, ads) lives in
`index.html`, plus a handful of small config files. No build step, no server.

## Files in this project

```
index.html      the entire app
manifest.json   PWA manifest
sw.js           service worker (offline shell caching)
netlify.toml    Netlify build/caching/security config
robots.txt      search engine crawl rules
sitemap.xml     search engine sitemap
icons/          app icons (favicon, PWA, apple-touch-icon)
README.md       this file
```

---

## 1. Deploy to Netlify (free tier)

**Option A — drag & drop (fastest):**
1. Go to https://app.netlify.com/drop
2. Drag this entire folder in.
3. You'll get a live URL like `https://random-name-123.netlify.app` immediately.

**Option B — Git-connected (recommended, gives you auto-deploys):**
1. Push this folder to a GitHub/GitLab/Bitbucket repo.
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
3. Build settings: leave **Build command** empty and **Publish directory** as `.`
   (this repo's `netlify.toml` already sets this for you).
4. Click **Deploy site**.

> ⚠️ **Common 404 cause:** `index.html` must sit at the *root* of whatever
> folder you deploy — not nested inside a subfolder (e.g. `repo/jadie-site/index.html`
> will 404). If your repo has this project inside a subfolder, either move the
> files up to the repo root, or set that subfolder as the **Root Directory** /
> **Publish directory** in your host's project settings.

Either way, Netlify serves you over **HTTPS automatically** — required for the
camera (`getUserMedia`) to work at all. If the app shows an "insecure origin"
warning banner, you're testing on plain `http://` or `file://` — deploy first.

### After first deploy — replace every placeholder domain
Search the project for `your-site.netlify.app` (in `index.html`, `robots.txt`,
`sitemap.xml`) and replace it with your real Netlify URL or custom domain.

---

## 2. Custom domain

Free Netlify subdomain works out of the box — no setup needed. When you're
ready for your own domain:
1. Netlify dashboard → your site → **Domain management → Add a custom domain**.
2. Point your domain's DNS to Netlify (they'll show you the exact records —
   usually a few `A`/`ALIAS` records or an `NS` delegation).
3. Netlify auto-provisions a free HTTPS certificate (Let's Encrypt) once DNS
   propagates — nothing else to configure for camera access to keep working.
4. Update the placeholder URLs mentioned above (canonical tag, OG tags,
   `robots.txt`, `sitemap.xml`) to your new domain.

---

## 3. Firebase (real multi-user rooms)

Without this, the app runs in **solo mode** — camera, filters, editor, export,
and sharing all work fully; only *live two-person sync* needs it.

1. https://console.firebase.google.com → **Add project** (free Spark plan).
2. **Build → Realtime Database → Create Database** (test mode is fine to start).
3. **Project settings → Your apps → Add app → Web (`</>`)** → copy the config.
4. Paste it into `FIREBASE_CONFIG` near the top of the `<script>` in
   `index.html` (search for `FIREBASE_CONFIG`).
5. Realtime Database → **Rules** tab, paste:
   ```json
   { "rules": { "rooms": { "$room": { ".read": true, ".write": true } } } }
   ```
   (Fine for a small app with no login; tighten later if you add auth.)

---

## 4. Google AdSense

1. Deploy your site live first (Google won't review a `localhost`/undeployed
   site or a build full of placeholder ad units).
2. Apply at https://www.google.com/adsense/ with your live URL.
3. Once **approved**:
   - In `index.html` `<head>`, uncomment the AdSense script tag and replace
     `ca-pub-XXXXXXXXXXXXXXXX` with your **Publisher ID**.
   - There are 3 ad slots already placed in the markup (search for
     `<div class="ad-slot"` — landing top, landing bottom, export modal).
     Each has a commented `<ins class="adsbygoogle">` template right inside
     it — uncomment it and fill in your Publisher ID + that unit's **Ad Slot
     ID** (AdSense → Ads → By ad unit → create a unit → copy the slot ID).
4. Ads **auto-hide for PRO users** (`.ad-slot` gets a `hidden` class) — this
   is intentional and a normal freemium pattern, not something to remove.

**Policy notes:**
- Don't click your own ads, even to test — use AdSense's test ad mode instead.
- Keep ad density reasonable; the 3 slots here are placed on
  content-carrying screens (landing, export), not on thin/utility screens —
  don't add more than a handful across the whole app.
- Google requires a live, functioning site with real content/traffic
  patterns before approval — a bare skeleton often gets rejected on first try.

---

## 5. Google Analytics 4 (GA4)

1. https://analytics.google.com → **Admin → Create property** → add a
   **Web** data stream → copy the **Measurement ID** (`G-XXXXXXXXXX`).
2. In `index.html` `<head>`, find `window.GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'`
   and replace with your real ID. That's it — the loader script right below
   it activates automatically once the ID isn't the placeholder.

**Events already wired up** (visible in GA4 → Reports → Realtime once live):
| Event | Fires when |
|---|---|
| `page_view` | every screen change (landing, room, camera, editor, gallery…) |
| `photo_capture` | each of the 4 synced shots is taken |
| `download` | image or photos+BTS bundle downloaded |
| `share` | any share-grid tile tapped (per-platform `method`) |
| `pro_button_click` | the "Go PRO" nav badge is tapped |
| `upgrade_modal_opened` | the PRO upsell modal opens (with `context`: filter/hd export/watermark/general) |
| `upgrade_attempt` | a payment button (Stripe/PayPal/GCash) is tapped |
| `room_entered` / `intro_viewed` / `app_loaded` | funnel/engagement tracking |

All of these route through one `logEvent(name, data)` helper (search for it)
— add more calls there if you want to track additional actions later.

---

## 6. Premium / PRO features

Already built as **UI + gating logic**, no payment processor wired up yet:
- 🔒 Watermark removal, HD/print (2×/3×) export, 8 extra filters, ad-free —
  all gated behind `state.pro` (persisted in `localStorage`).
- The "Go PRO" badge (top nav) opens an upgrade modal (search for
  `openUpgradeModal` / `#upgradeOverlay`) listing all PRO features and price.
- Three payment buttons (Stripe/PayPal/GCash) currently just show a toast
  telling you where to wire them up — see below.
- A **"Developer preview: simulate PRO unlock"** link in the modal flips
  `state.pro` to `true` locally with no payment, for your own testing.
  Remove or hide this button before public launch.

### Wiring up real payments later
- **Stripe**: create a [Payment Link](https://dashboard.stripe.com/payment-links)
  or [Checkout Session](https://stripe.com/docs/payments/checkout) → in the
  `#payStripe` click handler (search `initMonetization`), redirect
  (`location.href = 'https://buy.stripe.com/...'`) or call your backend to
  create a session. Verify payment server-side (a Netlify Function is enough)
  before calling `setProStatus(true)`.
- **PayPal**: a PayPal.Me link or [Smart Payment Buttons](https://developer.paypal.com/sdk/js/) —
  same pattern, verify server-side via webhook before unlocking.
- **GCash**: GCash doesn't have a public checkout API for most merchants —
  typically you'd show a QR code / payment link from a payment aggregator
  (PayMongo, Xendit, etc. support GCash) and confirm via their webhook.
- In all three cases: **never unlock PRO purely from a client-side click** in
  production — confirm payment success server-side (Netlify Function, or any
  small backend) and only then set a verified flag your client trusts.

### One-time vs subscription, sponsorships, affiliate links
The `state.pro` boolean is intentionally simple — swap it for a value from
your payment backend indicating tier/expiry when you add subscriptions.
Sponsorship banners or affiliate links can reuse the same `.ad-slot` markup
pattern (just swap the AdSense `<ins>` for a sponsor's banner or an affiliate
`<a>` link + tracked click via `logEvent('sponsor_click', {...})`).

---

## 7. SEO

Already in place in `index.html` `<head>`: title, meta description, keywords,
canonical URL, Open Graph tags, Twitter Card tags, favicon set, and
`robots.txt` / `sitemap.xml` at the project root. After deploying:
- Replace every `your-site.netlify.app` placeholder with your real domain.
- Submit `sitemap.xml` in [Google Search Console](https://search.google.com/search-console).
- Consider a purpose-made 1200×630 social preview image instead of the app
  icon (currently used as a fallback OG image).

---

## 8. Performance

- Fonts/CDN libraries use `preconnect` hints; the Firebase/GA/AdSense scripts
  load async and never block first paint.
- `netlify.toml` sets long-lived caching for `/icons/*` and `manifest.json`,
  and `no-cache` for `sw.js` so updates always propagate.
- The service worker caches the app shell (`/`, manifest, icons) so repeat
  visits and flaky connections still load something instead of failing.
- Run Lighthouse (Chrome DevTools → Lighthouse) after your first real deploy
  — most remaining wins will be image weight (the app has no large images by
  default) and third-party script timing (GA/AdSense, once you enable them).

---

## 9. PWA

Installable on Android (Chrome "Add to Home Screen") and iOS (Safari → Share
→ "Add to Home Screen"). Manifest + icons + service worker are already set
up — nothing further required. Update `manifest.json` if you rename the app.

---

## 10. Security

- `netlify.toml` sets `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, a `Permissions-Policy` that explicitly **allows** camera
  and microphone for this origin (don't remove that or the app breaks), and a
  `Content-Security-Policy` scoped to the exact third parties this app uses
  (Firebase, Google Fonts, GA, AdSense, cdnjs). If you add another third-party
  script later, you'll need to add its domain to the CSP or it'll be silently
  blocked — check the browser console after deploying.
- Camera permission handling: the app never requests the camera until the
  user taps an explicit "Turn On Camera" button (required for iOS Safari, and
  good practice generally), detects insecure origins/unsupported browsers
  *before* attempting `getUserMedia`, and gives specific recovery messages for
  each permission error type instead of a generic failure.

---

## 11. How this could make money (summary)

| Stream | Status | Notes |
|---|---|---|
| Google AdSense | Placeholders ready | 3 ad slots, hidden for PRO users, needs your Publisher ID + AdSense approval |
| PRO one-time/subscription | UI + gating built | Needs a real payment processor wired to `setProStatus()` |
| Sponsorship banners | Not built, easy to add | Reuse `.ad-slot` pattern |
| Affiliate links | Not built, easy to add | Standard tracked links + `logEvent()` |

None of this requires a backend beyond what a Netlify Function (or any tiny
serverless endpoint) can do for payment verification — the app itself stays
a static, zero-server-cost site either way.
