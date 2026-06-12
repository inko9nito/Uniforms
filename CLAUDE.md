# FCA Uniform Resale — Claude Context

**Owner:** Vera Maxakova (GitHub: inko9nito, email: vera13@gmail.com)  
**Repo:** https://github.com/inko9nito/Uniforms  
**Live site:** https://inko9nito.github.io/Uniforms/

---

## What this project is

A React + Vite + TypeScript static site for selling second-hand school uniforms. It is hosted on GitHub Pages with no runtime backend. **Inventory lives in Airtable** and is pulled into the repo at build time by `scripts/fetch-airtable.mjs` (runs in GitHub Actions, token stays server-side), which writes `src/data/inventory.generated.json` and downloads photos into `public/images/airtable/`. The app imports that JSON. The site is **read-only for buyers** — there is no in-app editor; all inventory changes happen in Airtable. (The old `inventory.md` table and the browser edit mode were removed in #51.) See **Airtable backend** below.

---

## Tech stack

| Layer | Choice |
|---|---|
| UI framework | React 18 + TypeScript |
| Build tool | Vite (base: `'./'` — relative, so builds work at root and at PR preview sub-paths) |
| UI / styling | **Tailwind CSS v4** (`@tailwindcss/vite`) + **Radix primitives** (the shadcn approach). Design tokens in `src/index.css` `@theme` (Plus Jakarta Sans, off-white page, near-black ink, violet `--color-brand`, `rounded-card`). Small in-repo UI kit in `src/components/ui/` (Button, Badge, Card, Dialog, Select). `cn()` = clsx + tailwind-merge; icons from `lucide-react`. Consumer-storefront ("Shop app") look — migrated off Shopify Polaris → Atlaskit → Tailwind across #55/#57. |
| Data source | **Airtable** → `src/data/inventory.generated.json` (built by `scripts/fetch-airtable.mjs`), imported in `src/data/inventory.ts` |
| Image storage | `public/images/` (legacy) + `public/images/airtable/` (downloaded from Airtable at build time) |
| Hosting | GitHub Pages, served from the `gh-pages` branch root |

---

## Inventory data model

Inventory comes entirely from Airtable (see **Airtable backend**). The `Item` type (in `src/data/inventory.ts`) has these fields:
```ts
id, section, name, displayName, size, schools, note (condition summary),
priceMin, priceMax, priceDisplay,
quantity (= availableCount), availableCount, reservedCount,
badge { label, tone }, images, sourceUrl,
instances [{ label, condition, conditionNotes, status, price, image? }]
```

- **section:** Girls, Boys, or Unisex (controls which group the item appears in)
- **schools:** subset of `Carrollton` / `Frisco`
- **images:** repo-relative paths (`images/airtable/foo.jpg`) or full URLs; empty falls back to a `GarmentThumbnail` illustration
- **sourceUrl:** optional link to the original store listing
- Helpers: `priceLabel(item)`, `isSoldOut(item)`, `badgeVariant(tone)` (→ UI Badge variant)

---

## Airtable backend

**Base ID:** `apphC2zBEMewkcgq7` — two tables:
- **Uniform Inventory** (`tbl3pn2gOaw715XbJ`) — one row per product. Key fields (by ID, since names can change): Item `fld65XJe9jg26AoFk`, **Official product photo** `fld5Oq6Q4SCwdTtbH`, Gender `fldNZguKSmUcvjlmf`, Size `fldh03fOzfk9cbAb6`, Campus `fldad07lOv6RpBdlt`, Price (rollup) `fldXaV0jjDKPPUhEw`, Qty available `fld4SXW0Dr2UaKZv7`, Qty reserved `fld1HqmGYyKXl130L`, Link `fldFrNTrYCFTD75Yr`, Availability (formula badge) `fldnpqC2HGTu93R9c`, **Visibility** `fldoBk5dezjgiJEmN` (`Published`/`Unpublished` — `Unpublished` rows are skipped).
- **Item Instances** (`tblaYze436czhC5o5`) — one row per physical garment: Instance, Product (link), Condition, Condition notes, Status (`Available`/`Reserved`/`Sold`), Price (currency), Actual photo.

**Build flow:** `scripts/fetch-airtable.mjs` fetches both tables (`returnFieldsByFieldId=true`), builds one product per published listing with a price range (`priceMin`/`priceMax` from instance prices), an availability badge (available wins over reserved, else "Sold out"), and a per-instance breakdown, then downloads photos (official product photos + instance "Actual photo"s) to `public/images/airtable/` and writes `src/data/inventory.generated.json`. The transform is exported and shape-agnostic (handles REST string selects and `{name}` objects) so a snapshot can be regenerated from a dump.

**Gotchas:**
- Attachment URLs **expire** — always download at build time, never hot-link.
- Rollup/count/lookup fields can't be created via the API; they already exist — just read them.
- The committed `inventory.generated.json` is a real-data snapshot but its `images` are `[]` (the Airtable CDN is firewalled from the dev/preview sandboxes). **CI populates real photos on deploy**, so PR previews show garment illustrations while production shows photos. Round-trip photo testing must be done on the live site.

**One-time owner setup (Claude can't do this):** create an Airtable PAT scoped `data.records:read` on this base → add it as repo secret **`AIRTABLE_TOKEN`** (Settings → Secrets and variables → Actions). Without it the deploy build fails at the sync step.

---

## Deployment

### Production
- **Trigger:** push to `main`
- **Workflow:** `.github/workflows/deploy.yml`
- **Action:** builds with `npm run build`, deploys `dist/` to the **root of the `gh-pages` branch** using `JamesIves/github-pages-deploy-action`. Cleans stale files but preserves `pr-preview/` so open previews survive production deploys.
- **Pages source (manual setting):** Settings → Pages → Source → "Deploy from a branch" → `gh-pages` / `(root)`. This is a one-time repo setting — Claude cannot change it.

### PR Previews
- **Trigger:** any PR open/update/close event
- **Workflow:** `.github/workflows/preview.yml`
- **Action:** builds the PR branch, deploys to `gh-pages/pr-preview/pr-<N>/` using `rossjrw/pr-preview-action`. The action **automatically comments the preview URL on the PR** and tears down the preview when the PR closes.
- **Preview URL pattern:** `https://inko9nito.github.io/Uniforms/pr-preview/pr-<N>/`
- **Photos in previews:** PR-preview builds run the Airtable sync too, so previews show real photos when `AIRTABLE_TOKEN` is reachable. If the firewall blocks the Airtable CDN, the preview falls back to garment illustrations.

### Standard PR workflow
1. Create a branch off `main`.
2. Make changes, `npm run build` to verify (TypeScript + Vite).
3. Push, open a PR via `mcp__github__create_pull_request`.
4. The preview workflow runs and posts a URL on the PR — share it with Vera to test.
5. Merge via `mcp__github__merge_pull_request` (always use `squash` method).
6. Close the related GitHub issues via `mcp__github__issue_write` (state: closed, state_reason: completed).

---

## Editing inventory

There is **no in-app editor** — the site is read-only for buyers. All inventory changes (listings, prices, photos, availability) are made directly in **Airtable**, then picked up by the next deploy (push to `main`, or the 6-hourly schedule). The former browser "manage mode" / `ManagePhotosPanel` / `inventory.md` / `src/data/github.ts` were removed in #51.

---

## Key files

| File | Purpose |
|---|---|
| `scripts/fetch-airtable.mjs` | Build-time Airtable → JSON sync (runs in CI). **Source of truth flow.** |
| `src/data/inventory.generated.json` | Generated inventory snapshot the app imports (regenerated each deploy) |
| `public/images/` | Product photos served as static assets (`airtable/` subdir is build-generated) |
| `src/index.css` | Tailwind v4 entry + `@theme` design tokens |
| `src/components/ui/` | In-repo UI kit: `button`, `badge`, `card`, `dialog` (Radix lightbox), `select` (Radix) |
| `src/lib/utils.ts` | `cn()` class-name merge helper |
| `src/data/inventory.ts` | Imports `inventory.generated.json`, exports typed `Item[]` + helpers (`priceLabel`, `isSoldOut`, `badgeVariant`) |
| `src/App.tsx` | Main app: filters (campus + gender), section grids, detail panel |
| `src/components/ItemDetailPanel.tsx` | Full-screen (mobile) / right drawer (desktop ≥768px) detail view: downplayed official-photo thumbnail beside Title / Price+badge / Size / Campus; per-instance cards; tap a photo → Radix Dialog lightbox |
| `src/components/ItemCard.tsx` | Grid card (square cover image, availability badge) |
| `src/components/PhotoGallery.tsx` | Swipeable image gallery (used in the lightbox) |
| `src/components/GarmentThumbnail.tsx` | SVG placeholder when no photos |
| `src/components/EmptySchoolState.tsx` | Empty state when filters return nothing |
| `.github/workflows/deploy.yml` | Production deploy to gh-pages |
| `.github/workflows/preview.yml` | PR preview deploys |

---

## Commands

```bash
npm run dev      # Start dev server at http://localhost:5173/
npm run build    # Type-check (tsc) + production build into dist/
```

---

## GitHub rate limit behaviour

After a burst of GitHub API calls, GitHub's secondary rate limit can block calls for 5–15+ minutes. The merge tool works fine but `mcp__github__issue_write` is often the first call to fail. Retry with waits: 60s → 180s → 300s. If it still fails, ask Vera to close the issue manually at `https://github.com/inko9nito/Uniforms/issues/<N>`.

---

## Notes for future sessions

- Always branch off `main` for new work.
- Run `npm run build` before committing — it runs the TypeScript compiler and Vite.
- Use squash merges. Never push directly to `main`.
- GitHub MCP tools (`mcp__github__*`) are available for PR creation, merging, and issue management. Load schemas via `ToolSearch` before calling.
- If GitHub MCP OAuth shows "Server Turned Down", the auth endpoint is broken on Anthropic's side — it's not a repo issue.
- The old branch `claude/uniform-resale-app-NWrWF` exists remotely but is far behind `main` — do NOT use it. Always create a fresh branch from `main`.
- **Inventory is Airtable-backed and the site is read-only.** All listing/price/photo/availability changes happen in Airtable; the next deploy picks them up. There is no in-app editor (removed in #51).
- The Airtable CDN (`*.airtableusercontent.com`) and API are firewalled from Claude's sandboxes, so `npm run build` / image downloads can't reach Airtable locally; only CI (GitHub-hosted runners) can. Verify data via the Airtable MCP and let CI do the real fetch.
- **Styling is Tailwind v4 + Radix (shadcn approach).** Colors/radius/font come from `@theme` tokens in `src/index.css` (`bg-brand`, `text-ink`, `rounded-card`, …). Reusable components live in `src/components/ui/`; icons from `lucide-react`. Availability badges use the `Badge` UI variant from `badgeVariant(tone)` (success / warning / neutral; sold out → danger).
