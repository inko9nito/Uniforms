# FCA Uniform Resale

A simple public page for reselling Founders Classical Academy uniform items.
Each piece is listed individually with its size, condition, applicable
school(s), price, and live availability so buyers can self-serve instead of
asking whether something is still available.

## Live site

Once GitHub Pages is enabled (see below), the page is published at:

```
https://inko9nito.github.io/Uniforms/
```

## Managing inventory

All inventory lives in **[`inventory.md`](./inventory.md)** — a plain markdown
table you can edit directly in GitHub's web editor.

- Change a row's **Status** to `Sold` to gray it out (or `Available` to relist).
- Set **Schools** to `Carrollton`, `Frisco`, or `Both`.
- Add/remove items by adding/deleting rows.

Commit your change to `main` and the site rebuilds and updates automatically.
Because edits require a commit, only people with write access to this repo can
change what the public sees.

On the site, **Manage inventory** mode adds a local-only "mark as sold"
scratchpad (visible only in your browser) plus per-item links straight to the
GitHub editor for the matching row.

## Enabling GitHub Pages (one-time)

1. Repo **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or run the *Deploy to GitHub Pages* workflow manually).

## Local development

```bash
npm install
npm run dev      # http://localhost:5173/
npm run build    # type-check + production build into dist/
```

Built with React, Vite, TypeScript, and the [Shopify Polaris](https://polaris.shopify.com/) design system.
