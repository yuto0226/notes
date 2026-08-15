# Repository Guide

Personal site at **blog.yuto0226.dev**, built with Astro 5, Tailwind CSS v4, and React for interactive UI components. The project is based on [jktrn/astro-erudite](https://github.com/jktrn/astro-erudite).

## Working Agreements


- The user normally runs the development server on port 1234. Do not start another server there unless asked.
- Do not commit files under `docs/` or test artifacts unless the user explicitly approves them.
- Tests may be created for verification without being committed.
- Use subagents for genuinely heavy or independent work, not routine edits.

## Commands

```bash
rtk pnpm dev       # Development server at http://localhost:1234
rtk pnpm build     # Astro type-check followed by a static build
rtk pnpm preview   # Preview the production build
rtk pnpm prettier  # Format TypeScript, CSS, and Astro files
```

There is no committed automated test suite. Use `pnpm build` as the baseline verification and add focused, uncommitted checks when behavior needs regression coverage.

## Content Architecture

The site currently has two publishing collections:

- **Essays** (`src/content/essays/`) — authored viewpoints and deliberately shaped paths of thought. Essays may be personal, literary, analytical, or technical.
- **Notes** (`src/content/notes/`) — external memory for reference, reuse, continuation, and reproducible work, including technical notes, lecture material, CTF writeups, and experiment drafts.

Research is part of the longer-term design but has not been implemented. Do not assume that a `research` collection or `/research` routes exist.

Topic discovery uses `tags`. Notes still accept the legacy optional `categories` field; do not build new behavior around it unless requested.

### Content Collections (`src/content.config.ts`)

- `notes` — Notes, Series entries, and parent/subpost writeups
- `essays` — standalone Essays
- `authors` — author profiles
- `friends` — friend profiles rendered at the end of About
- `projects` — project showcase entries
- `milestones` — education and work history

Both Notes and Essays use Markdown or MDX frontmatter with `title`, `description`, `date`, optional `updated`, `image`, `tags`, `authors`, and `draft`. Notes additionally support `pinned`, `order`, and `categories`.

Dates are coerced by Zod. Prefer `YYYY-MM-DD`; use an ISO 8601 value with an explicit timezone when time-of-day matters, for example `2026-08-14T09:30:00+08:00`.

## Notes Structures

### Parent and Subposts

A top-level Note may own dependent subposts, such as a CTF event writeup containing individual challenge solutions. The parent is a directory `index.md` or `index.mdx`; sibling Markdown or MDX files are its subposts.

Public subposts:

- have their own canonical, indexable detail URL;
- are included in the sitemap;
- are reached through their parent navigation; and
- are excluded from the Notes archive, tags, authors, and RSS to avoid duplicating their parent on discovery surfaces.

Draft subposts stay unpublished. A subpost may not act as another independent parent in the ordinary writeup structure.

### Series

A Series is stored at `src/content/notes/series/<series-id>/`:

- `index.md` or `index.mdx` defines the authorless Series landing page and introduction;
- direct children are independent Series posts, ordered from oldest to newest by `date`;
- a Series post may itself own dependent subposts.

Series cards appear above ordinary Notes on the first `/notes` archive page. Series parents and posts do not repeat in the standalone Notes list. Authors belong to Series posts, not to the Series parent and are not inferred by aggregation.

The hierarchy and classification helpers live in `src/lib/series.ts` and `src/lib/data-utils.ts`.

## Essays

`/essays` is a paginated, newest-first archive. Essay IDs must not be numeric because numeric paths are reserved for pagination. Essay detail pages reuse the long-form post presentation and may have authors, tags, a local table of contents, and an authored hero image.

Images are always optional. No page or card supplies a fallback hero: render image space only when the entry explicitly provides an image. Social share images (`og:image`/`twitter:image`) are the exception — every Note and Essay detail page gets one regardless of whether it has an authored hero image, generated at build time by `src/lib/og-image.ts` and served from `/og/notes/<id>.png` or `/og/essays/<id>.png`.

Essay helpers and ID validation live in `src/lib/essays.ts`.

## Discovery Policy

- `/tags/<tag>` separates matching Essays and Notes into distinct sections while preserving native URLs.
- `/authors/<id>` lists public independent Essays and Notes by that author.
- RSS combines public, independent Essays and Notes newest first.
- Draft entries and dependent subposts are excluded from archive, tag, author, and RSS discovery.
- Public content detail pages use self-canonical URLs. Dependent subposts remain indexable and appear in the sitemap.

## Routing

| Route | File |
| --- | --- |
| `/essays` and `/essays/<page>` | `src/pages/essays/[...page].astro` |
| `/essays/<id>` | `src/pages/essays/[...id].astro` |
| `/notes` and `/notes/<page>` | `src/pages/notes/[...page].astro` |
| `/notes/<id>` | `src/pages/notes/[...id].astro` |
| `/notes/series/<series-id>/...` | `src/pages/notes/series/[...id].astro` |
| `/tags/<tag>` | `src/pages/tags/[...id].astro` |
| `/authors/<id>` | `src/pages/authors/[...id].astro` |
| `/about` | `src/pages/about.astro` |

The former `/blog` namespace has been replaced by `/notes`. Backward-compatible redirects are not currently implemented.

## Key Files

- `src/consts.ts` — site configuration, navigation, social links, and icon map
- `src/content.config.ts` — collection loaders and Zod schemas
- `src/lib/data-utils.ts` — Notes and cross-collection discovery helpers
- `src/lib/essays.ts` — Essay retrieval and ID policy
- `src/lib/series.ts` — Series hierarchy and integrity rules
- `src/components/PostDetail.astro` — shared long-form detail layout
- `src/components/TOCSidebar.astro` and `src/components/SubpostsSidebar.astro` — desktop article navigation

## Styling and Rendering

Tailwind CSS v4 is provided through `@tailwindcss/vite`. CSS variables follow shadcn/ui conventions such as `--border`, `--muted`, and `--muted-foreground`. Theme switching uses `data-theme="light"` and `data-theme="dark"` on the root element.

Expressive Code renders fenced code blocks with GitHub light and dark themes. Inline highlighting uses Shiki's `tailing-curly-colon` syntax, for example `` `code`{:lang} ``. Math uses KaTeX through `remark-math` and `rehype-katex`.
