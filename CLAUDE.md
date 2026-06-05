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
| Component library | Shopify Polaris |
| Data source | `inventory.md` — a Markdown table, parsed in `src/data/inventory.ts` |
| Image storage | `public/images/` — referenced in the Image column of `inventory.md` |
| Hosting | GitHub Pages, served from the `gh-pages` branch root |

---

## Inventory data model

`inventory.md` contains one Markdown table with these columns (0-indexed):

```
Section | Item | Size | Schools | Condition | Price | Qty | Image | Link
```

- **Image** column: comma-separated paths (`images/foo.jpg`) or full URLs.
- Each row gets a `sourceLine` (1-based line number in `inventory.md`) used to patch the file via the GitHub API from the browser.

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

### Standard PR workflow
1. Create a branch off `main`.
2. Make changes, `npm run build` to verify (TypeScript + Vite).
3. Push, open a PR via `mcp__github__create_pull_request`.
4. The preview workflow runs and posts a URL on the PR — share it with Vera to test.
5. Merge via `mcp__github__merge_pull_request` (always use `squash` method).
6. Close the related GitHub issues via `mcp__github__issue_write` (state: closed, state_reason: completed).

---

## Browser-side editing (manage mode)

There is an in-browser edit mode accessible via the floating "Edit" button (bottom-right, z-index 530). It requires a GitHub personal access token (PAT) with `repo` scope.

- Token is stored in `localStorage` under key `fca-github-token` — it is **per-device and per-browser**, not synced. Each device needs its own token (they can be different tokens).
- Token is used to call the GitHub Contents API (`PUT /repos/inko9nito/Uniforms/contents/...`) to commit changes directly to `main`.
- Helpers are in `src/data/github.ts`: `getFile`, `putFile`, `addImageToInventoryContent`, `removeImageFromInventoryContent`, `setInventoryImages`, `setInventorySize`, `setInventoryQuantity`.
- Edit panel component: `src/components/ManagePhotosPanel.tsx` — lets Vera change size, quantity, add/remove/reorder photos.

---

## Key files

| File | Purpose |
|---|---|
| `inventory.md` | Source of truth for all listings |
| `public/images/` | Product photos served as static assets |
| `src/data/inventory.ts` | Parses `inventory.md` into `Item[]` at build time |
| `src/data/github.ts` | GitHub API helpers + inventory patch functions |
| `src/App.tsx` | Main app, filters, manage mode toggle (floating FAB) |
| `src/components/ItemDetailPanel.tsx` | Full-screen (mobile) / right drawer (desktop ≥768px) detail view |
| `src/components/ManagePhotosPanel.tsx` | Edit-mode panel: size, qty, photo add/remove/reorder |
| `src/components/ItemCard.tsx` | Grid card |
| `src/components/PhotoGallery.tsx` | Swipeable image gallery in the detail view |
| `.github/workflows/deploy.yml` | Production deploy to gh-pages |
| `.github/workflows/preview.yml` | PR preview deploys |

---

## Commands

```bash
npm run dev      # Start dev server at http://localhost:5173/
npm run build    # Type-check (tsc) + production build into dist/
```

---

## Notes for future sessions

- Always branch off `main` for new work.
- Run `npm run build` before committing — it runs the TypeScript compiler and Vite.
- Use squash merges. Never push directly to `main`.
- GitHub MCP tools (`mcp__github__*`) are available for PR creation, merging, and issue management. Load schemas via `ToolSearch` before calling.
- If GitHub MCP OAuth shows "Server Turned Down", the auth endpoint is broken on Anthropic's side — it's not a repo issue.
