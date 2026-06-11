# FCA Uniform Resale

A public storefront for reselling Founders Classical Academy uniform items.
Each physical garment is listed with its size, condition, applicable school(s),
price, and live availability so buyers can self-serve instead of asking whether
something is still available.

**Live site:** https://inko9nito.github.io/Uniforms/

The site is **read-only for buyers** — there is no in-app editor. All inventory
is managed in **Airtable** and pulled into the site at deploy time.

---

## How it's structured

A React + Vite + TypeScript single-page app, built to static files and hosted on
GitHub Pages. There is **no runtime backend** — the page ships with its inventory
baked in as JSON, so it loads fast and there's nothing to keep running.

| Layer | Choice |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite (`base: './'` so it works at the Pages root and at PR-preview sub-paths) |
| Styling | Tailwind CSS v4 + Radix primitives (the "shadcn" approach); design tokens in `src/index.css`. Small in-repo UI kit in `src/components/ui/`. Icons from `lucide-react`. |
| Data | **Airtable** → `src/data/inventory.generated.json` (generated at build time), imported by `src/data/inventory.ts` |
| Hosting | GitHub Pages, served from the root of the `gh-pages` branch |

### Project layout

```
scripts/fetch-airtable.mjs        Build-time Airtable → JSON sync (runs in CI)
src/
  data/
    inventory.ts                  Typed Item[] + helpers (priceLabel, isSoldOut, badgeVariant)
    inventory.generated.json      Inventory snapshot the app imports (regenerated each deploy)
  components/
    ui/                           Button, Badge, Card, Dialog (lightbox), Select
    ItemCard.tsx                  Grid card
    ItemDetailPanel.tsx           Detail drawer: photos, per-garment instances, lightbox
    PhotoGallery.tsx              Swipeable gallery used in the lightbox
    GarmentThumbnail.tsx          SVG placeholder when a listing has no photo
    EmptySchoolState.tsx          "No items match these filters" state
  App.tsx                         Filters (campus + gender) + section grids
  index.css                       Tailwind entry + @theme design tokens
public/images/airtable/           Product/instance photos downloaded from Airtable at build time
.github/workflows/                deploy.yml (production) + preview.yml (PR previews)
```

### Data flow

```
Airtable (source of truth)
   │   scripts/fetch-airtable.mjs   ← runs in GitHub Actions, token from secrets
   ▼
src/data/inventory.generated.json  +  public/images/airtable/*.jpg
   │   npm run build (Vite + tsc)
   ▼
dist/  ──► published to the gh-pages branch  ──►  GitHub Pages (live site)
```

---

## Managing inventory (Airtable)

All listings, prices, photos, and availability are edited in **Airtable** — never
in this repo. The next deploy picks the changes up automatically.

The base has two tables:

- **Uniform Inventory** — one row per product (name, gender, size, campus, link,
  quantities, and a **Visibility** field; rows set to `Unpublished` are skipped).
- **Item Instances** — one row per physical garment (condition, condition notes,
  **Status** = `Available` / `Reserved` / `Sold`, price, and an "Actual photo").

The site shows a price range per product, an availability badge (green when
available, amber when only reserved, grey when sold out), and a clickable
per-garment breakdown built from the instances.

---

## Deployment & Airtable sync

### Production (`.github/workflows/deploy.yml`)

The production deploy is what syncs the live site with Airtable. It runs on:

- **Every push to `main`**,
- **A schedule** — every 6 hours (`cron: '0 */6 * * *'`), so availability and
  prices stay current on their own, and
- **Manually** — GitHub → **Actions** tab → **Deploy to GitHub Pages** →
  **Run workflow**. Use this to push an Airtable change live immediately instead
  of waiting for the schedule.

Each run:

1. **Sync inventory from Airtable** — `scripts/fetch-airtable.mjs` fetches both
   tables and downloads photos, writing `inventory.generated.json` and
   `public/images/airtable/`. The Airtable token lives only in Actions secrets
   (`AIRTABLE_TOKEN`), so it never reaches the browser.
2. **Build** — `npm run build` (TypeScript check + Vite production build).
3. **Publish** — pushes `dist/` to the root of the `gh-pages` branch (preserving
   the `pr-preview/` folder so open previews survive).

> **Why don't my Airtable edits show up instantly?** The live site is a snapshot,
> not a live database connection. It refreshes on the schedule above, on any push
> to `main`, or when you run the workflow manually. After a deploy, hard-refresh
> the page (the Pages CDN can lag ~1 minute).

### PR previews (`.github/workflows/preview.yml`)

Every pull request gets its own preview deploy at
`https://inko9nito.github.io/Uniforms/pr-preview/pr-<N>/`, and the bot comments
the link on the PR. Previews run the Airtable sync too, so they show real photos
when the token is reachable.

---

## One-time setup (owner only)

These are repo settings Claude can't change:

1. **Airtable token** — create an Airtable personal access token scoped
   `data.records:read` on the base, then add it as a repo secret named
   **`AIRTABLE_TOKEN`** (Settings → Secrets and variables → Actions). Without it
   the deploy fails at the sync step.
2. **Pages source** — Settings → Pages → Source → **Deploy from a branch** →
   `gh-pages` / `(root)`.

---

## Local development

```bash
npm install
npm run dev      # http://localhost:5173/
npm run build    # type-check (tsc) + production build into dist/
```

Note: the Airtable API/CDN is firewalled from most dev sandboxes, so a local
build can't fetch live data — it uses the committed `inventory.generated.json`
snapshot (which ships with empty `images`, so you'll see garment illustrations).
Real photos are fetched by CI on deploy. Round-trip photo testing is done on the
live site or a PR preview.
