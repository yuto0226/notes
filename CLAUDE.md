# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Dev server at http://localhost:1234
pnpm build        # Type-check + build (astro check && astro build)
pnpm preview      # Preview production build
pnpm prettier     # Format all .ts, .tsx, .css, .astro files
```

No test suite exists in this project.

## Architecture Overview

Personal blog at **blog.yuto0226.dev**, built with Astro 5 + Tailwind CSS v4 + React (for shadcn/ui components). Based on [jktrn/astro-erudite](https://github.com/jktrn/astro-erudite).

### Content Collections (`src/content.config.ts`)

Four collections managed via Astro's Content Collections API:

- **blog** — markdown/MDX posts with frontmatter: `title`, `description`, `date`, `updated?`, `tags?`, `authors?`, `draft?`, `pinned?`, `order?`, `image?`
- **authors** — author profiles (`src/content/authors/`)
- **friends** — friend link profiles (`src/content/friends/`)
- **projects** — project showcase entries (`src/content/projects/`)

### Subpost System

A post whose `id` contains `/` is a **subpost** (e.g. `my-series/part-1`). The parent post is `my-series/index.md`. Subposts share a TOC sidebar and navigation with their parent. The logic lives in `src/lib/data-utils.ts` (`isSubpost`, `getParentId`, `getSubpostsForParent`).

- `draft: true` hides a post from all listings
- `pinned: true` surfaces the post in the featured section on the homepage
- Subpost ordering: sorted by `date` first, then `order` field

### Key Files

- `src/consts.ts` — site-wide config (`SITE`, `NAV_LINKS`, `SOCIAL_LINKS`, `ICON_MAP`)
- `src/lib/data-utils.ts` — all content-fetching helpers (always use these, never call `getCollection` directly in pages)
- `src/lib/utils.ts` — `readingTime`, `calculateWordCountFromHtml`, `cn` (clsx + tailwind-merge)
- `src/content.config.ts` — Zod schemas for all collections

### Routing

| Route | File |
|---|---|
| `/blog` (paginated) | `src/pages/blog/[...page].astro` |
| `/blog/[slug]` | `src/pages/blog/[...id].astro` |
| `/tags/[tag]` | `src/pages/tags/[...id].astro` |
| `/authors/[id]` | `src/pages/authors/[...id].astro` |

### Styling

Tailwind CSS v4 (via `@tailwindcss/vite` plugin). CSS variables follow shadcn/ui conventions (`--border`, `--muted`, `--muted-foreground`, etc.). Theme toggle uses `[data-theme="light"]` / `[data-theme="dark"]` attribute on `<html>`.

### Code Blocks

Expressive Code handles fenced code blocks with `github-light`/`github-dark` themes. Inline syntax highlighting uses Shiki with `tailing-curly-colon` syntax (e.g. `` `code`{:lang} ``). Math is rendered via KaTeX (`remark-math` + `rehype-katex`).
