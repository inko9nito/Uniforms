# FCA Uniform Resale — Claude Context

**Owner:** Vera Maxakova (GitHub: inko9nito, email: vera13@gmail.com)  
**Repo:** https://github.com/inko9nito/Uniforms  
**Live site:** https://inko9nito.github.io/Uniforms/

---

## What this project is

A React + Vite + TypeScript static site for selling second-hand school uniforms. It is hosted on GitHub Pages with no backend. Inventory is stored as a Markdown table in `inventory.md` and parsed at build time via a `?raw` Vite import.

---

## Tech stack

| Layer | Choice |
|---|---|
| UI framework | React 18 + TypeScript |
| Build tool | Vite (base: `'./'` — relative, so builds work at root and at PR preview sub-paths) |
| Component library | Shopify Polaris v12 (`@shopify/polaris-icons` available as transitive dep — import directly) |
| Data source | `inventory.md` — a Markdown table, parsed in `src/data/inventory.ts` |
| Image storage | `public/images/` — referenced in the Image column of `inventory.md` |
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

The parsed `Item` type has these fields:
```ts
id, section, name, displayName, size, schools, note (condition),
unitPrice, quantity, images, sourceUrl, sourceLine
```

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
| `inventory.md` | Source of truth for all listings |
| `public/images/` | Product photos served as static assets |
| `src/data/inventory.ts` | Parses `inventory.md` into `Item[]` at build time |
| `src/data/github.ts` | GitHub API helpers + inventory patch functions |
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
