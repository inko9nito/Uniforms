# FCA Uniform Resale — Claude Context

**Owner:** Vera Maxakova (GitHub: inko9nito, email: vera13@gmail.com)  
**Repo:** https://github.com/inko9nito/Uniforms  
**Live site:** https://inko9nito.github.io/Uniforms/

---

## What this project is

A React + Vite + TypeScript static site for selling second-hand school uniforms. It is hosted on GitHub Pages with no runtime backend. **Inventory now lives in Airtable** and is pulled into the repo at build time by `scripts/fetch-airtable.mjs` (runs in GitHub Actions, token stays server-side), which writes `src/data/inventory.generated.json` and downloads photos into `public/images/airtable/`. The app imports that JSON. The old `inventory.md` Markdown table is retained only for the dormant browser editor and no longer feeds the site. See **Airtable backend** below.

---

## Tech stack

| Layer | Choice |
|---|---|
| UI framework | React 18 + TypeScript |
| Build tool | Vite (base: `'./'` — relative, so builds work at root and at PR preview sub-paths) |
| Component library | Shopify Polaris v12 (`@shopify/polaris-icons` available as transitive dep — import directly) |
| Data source | **Airtable** → `src/data/inventory.generated.json` (built by `scripts/fetch-airtable.mjs`), imported in `src/data/inventory.ts` |
| Image storage | `public/images/` (legacy) + `public/images/airtable/` (downloaded from Airtable at build time) |
| Hosting | GitHub Pages, served from the `gh-pages` branch root |

---

## Inventory data model

`inventory.md` contains one Markdown table with these columns (0-indexed):

```
Section(0) | Item(1) | Size(2) | Schools(3) | Condition(4) | Price(5) | Qty(6) | Image(7) | Link(8)
```

- **Section:** Girls, Boys, or Unisex (controls which group the item appears in)
- **Schools:** `Carrollton`, `Frisco`, or `Both`
- **Image** column: comma-separated paths (`images/foo.jpg`) or full URLs
- **Link** column: optional URL to original store listing
- Each row gets a `sourceLine` (1-based line number in `inventory.md`) used to patch the file via the GitHub API from the browser
- The `COL` const in `src/data/github.ts` maps field names to column indices — always use it rather than hard-coding numbers

The `Item` type (in `src/data/inventory.ts`) now has these fields:
```ts
id, section, name, displayName, size, schools, note (condition summary),
unitPrice (= priceMin), priceMin, priceMax, priceDisplay,
quantity (= availableCount), availableCount, reservedCount,
badge { label, tone }, images, sourceUrl, sourceLine (0 — Airtable-backed),
instances [{ label, condition, conditionNotes, status, price }]
```
`unitPrice`/`quantity` are kept as aliases so the dormant `inventory.md` editor still compiles. `sourceLine` is always `0`.

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
- **Important:** The preview is built from the **PR branch's** snapshot of `inventory.md`. Edit mode always writes to `main`. So a save on the preview → reload of the preview will NOT show the edit (it reads the PR branch). The optimistic in-session update will still work. Full round-trip testing (save → reload → persisted) must be done on the **live production site** after merging.

### Standard PR workflow
1. Create a branch off `main`.
2. Make changes, `npm run build` to verify (TypeScript + Vite).
3. Push, open a PR via `mcp__github__create_pull_request`.
4. The preview workflow runs and posts a URL on the PR — share it with Vera to test.
5. Merge via `mcp__github__merge_pull_request` (always use `squash` method).
6. Close the related GitHub issues via `mcp__github__issue_write` (state: closed, state_reason: completed).

---

## Browser-side editing (manage mode)

There is an in-browser edit mode accessible via the floating **"Edit"** button (bottom-right, `position: fixed`, `zIndex: 530`). Tapping it, then tapping a card, opens the item detail panel with a `ManagePhotosPanel` section at the bottom.

### Token
- Requires a GitHub PAT with `repo` scope
- Stored in `localStorage` under key `fca-github-token` — **per-device and per-browser**, not synced. Each device needs its own token (can be different tokens).
- Token is used to call the GitHub Contents API (`PUT /repos/inko9nito/Uniforms/contents/...`) to commit changes directly to `main`

### What can be edited from the browser
All fields save together in a single `inventory.md` commit via `setInventoryCells`:
- **Title** (Item name)
- **Gender** (Section) — Select: Girls / Boys / Unisex
- **Campus** (Schools) — multi-select ChoiceList: Carrollton / Frisco (saved as "Both" when both selected)
- **Size**
- **Condition** (note)
- **Price**
- **Qty**
- **Original product URL** (Link column)
- **Photos** — add (upload from device or paste URL), remove, reorder (↑/↓)

### Optimistic updates
`ManagePhotosPanel` takes an `onItemPatched(patch: Partial<Item>)` callback. After every successful save, it calls this with the updated fields. `ItemDetailPanel` merges the patch into `current` immediately, so edits appear in the detail view right away — no reload needed.

### GitHub helpers (`src/data/github.ts`)
- `COL` — exported const mapping field names → column indices (0-indexed)
- `setInventoryCells(md, sourceLine, updates: Record<number, string>)` — patches multiple columns in one pass
- `setInventoryCell(md, sourceLine, colIndex, value)` — single column (uses setInventoryCells internally)
- `setInventorySize`, `setInventoryCondition`, `setInventoryQuantity`, `setInventoryImages` — convenience wrappers
- `addImageToInventoryContent`, `removeImageFromInventoryContent` — append/remove image from image cell
- `getFile`, `putFile` — GitHub Contents API read/write
- `fileToBase64`, `slugify`, `loadToken`, `saveToken`

---

## Key files

| File | Purpose |
|---|---|
| `scripts/fetch-airtable.mjs` | Build-time Airtable → JSON sync (runs in CI). **Source of truth flow.** |
| `src/data/inventory.generated.json` | Generated inventory snapshot the app imports (regenerated each deploy) |
| `inventory.md` | Legacy table; only the dormant browser editor still writes to it |
| `public/images/` | Product photos served as static assets (`airtable/` subdir is build-generated) |
| `src/data/inventory.ts` | Imports `inventory.generated.json`, exports typed `Item[]` + helpers (`priceLabel`, `isSoldOut`, `polarisBadgeTone`) |
| `src/data/github.ts` | GitHub API helpers for the dormant `inventory.md` editor |
| `src/App.tsx` | Main app, filters (campus + gender), manage mode toggle (floating FAB) |
| `src/components/ItemDetailPanel.tsx` | Full-screen (mobile) / right drawer (desktop ≥768px) detail view; merges `onItemPatched` into `current` state |
| `src/components/ManagePhotosPanel.tsx` | Edit-mode panel: all editable fields + photo management; uses Polaris FormLayout, Thumbnail, Banner, ChoiceList, Select, icon buttons |
| `src/components/ItemCard.tsx` | Grid card |
| `src/components/PhotoGallery.tsx` | Swipeable image gallery in the detail view |
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

After a series of commits (e.g. several edit-mode saves in a row), GitHub's secondary rate limit can block API calls for 5–15+ minutes. The merge tool works fine but `mcp__github__issue_write` is often the first call to fail. Retry with waits: 60s → 180s → 300s. If it still fails, ask Vera to close the issue manually at `https://github.com/inko9nito/Uniforms/issues/<N>`.

---

## Notes for future sessions

- Always branch off `main` for new work.
- Run `npm run build` before committing — it runs the TypeScript compiler and Vite.
- Use squash merges. Never push directly to `main`.
- GitHub MCP tools (`mcp__github__*`) are available for PR creation, merging, and issue management. Load schemas via `ToolSearch` before calling.
- If GitHub MCP OAuth shows "Server Turned Down", the auth endpoint is broken on Anthropic's side — it's not a repo issue.
- The old branch `claude/uniform-resale-app-NWrWF` exists remotely but is far behind `main` — do NOT use it. Always create a fresh branch from `main`.
- When Vera tests on a PR preview and says "it's not saving" or "blank after save" — the preview reads the PR branch snapshot, but edit mode writes to `main`. This is expected. Instruct her to test persistence on the production site after merging.
- The `@shopify/polaris-icons` package is available as a transitive dependency (installed by Polaris). Import icons like `ArrowUpIcon`, `ArrowDownIcon`, `DeleteIcon`, `PlusIcon` directly from `@shopify/polaris-icons` without adding it to `package.json`.
- **Inventory is Airtable-backed now.** Edit listings in Airtable, not `inventory.md`. The browser "Edit" manage mode still works but writes to `inventory.md`, which each deploy **overwrites** from Airtable — so those edits are effectively temporary. Consider it deprecated.
- The Airtable CDN (`*.airtableusercontent.com`) and API are firewalled from Claude's sandboxes, so `npm run build` / image downloads can't reach Airtable locally; only CI (GitHub-hosted runners) can. Verify data via the Airtable MCP and let CI do the real fetch.
- Polaris `<Badge>` has no `subdued`/gray tone — pass `tone={undefined}` for it. Use `polarisBadgeTone()` from `inventory.ts` to map our `BadgeTone`.
