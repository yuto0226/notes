# SEO Indexing Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the technical issues preventing blog posts from being indexed by Google Search.

**Architecture:** Three targeted file changes — fix the canonical URL bug in both head components, add a `robots.txt`, and strengthen article meta tags in `PostHead.astro`.

**Tech Stack:** Astro 5, TypeScript, `@astrojs/sitemap`

> Note: This project has no test suite (`pnpm build` runs `astro check && astro build` for type-checking). Verification is done via build output and manual browser inspection.

---

### Task 1: Fix Canonical URL in PageHead.astro

**Files:**
- Modify: `src/components/PageHead.astro:20`

The current canonical always points to the site root (`SITE.href`). Replace it with `Astro.url.href` so each page declares its own URL as canonical.

- [ ] **Step 1: Open the file and locate the canonical tag**

File: `src/components/PageHead.astro`, line 20:
```html
<link rel="canonical" href={SITE.href} />
```

- [ ] **Step 2: Replace with the current page URL**

Change to:
```html
<link rel="canonical" href={Astro.url.href} />
```

- [ ] **Step 3: Run type-check to verify no errors**

```bash
pnpm build
```
Expected: build completes without errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/PageHead.astro
git commit -m "fix(seo): use current page URL for canonical in PageHead"
```

---

### Task 2: Fix Canonical URL in PostHead.astro

**Files:**
- Modify: `src/components/PostHead.astro:24`

Same bug as Task 1, in the blog post–specific head component.

- [ ] **Step 1: Open the file and locate the canonical tag**

File: `src/components/PostHead.astro`, line 24:
```html
<link rel="canonical" href={SITE.href} />
```

- [ ] **Step 2: Replace with the current page URL**

Change to:
```html
<link rel="canonical" href={Astro.url.href} />
```

- [ ] **Step 3: Run type-check to verify no errors**

```bash
pnpm build
```
Expected: build completes without errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/PostHead.astro
git commit -m "fix(seo): use current page URL for canonical in PostHead"
```

---

### Task 3: Add robots.txt

**Files:**
- Create: `public/robots.txt`

Astro serves everything in `public/` as static files at the root. Creating this file makes it available at `https://blog.yuto0226.dev/robots.txt`.

- [ ] **Step 1: Create the file**

Create `public/robots.txt` with the following content:
```
User-agent: *
Allow: /

Sitemap: https://blog.yuto0226.dev/sitemap-index.xml
```

- [ ] **Step 2: Verify it will be served**

```bash
pnpm build && ls dist/robots.txt
```
Expected: `dist/robots.txt` exists.

- [ ] **Step 3: Commit**

```bash
git add public/robots.txt
git commit -m "feat(seo): add robots.txt with sitemap reference"
```

---

### Task 4: Fix og:type and Add Article Timestamps in PostHead.astro

**Files:**
- Modify: `src/components/PostHead.astro`

Currently `og:type` is `website` for blog posts. It should be `article`. Also add `article:published_time` and conditionally `article:modified_time` so Google can understand content freshness.

- [ ] **Step 1: Locate the og:type tag in PostHead.astro**

File: `src/components/PostHead.astro`. Find:
```html
<meta property="og:type" content="website" />
```

- [ ] **Step 2: Replace og:type and add article timestamps**

Replace that single line with:
```html
<meta property="og:type" content="article" />
<meta property="article:published_time" content={post.data.date.toISOString()} />
{post.data.updated && (
  <meta property="article:modified_time" content={post.data.updated.toISOString()} />
)}
```

- [ ] **Step 3: Run type-check to verify no errors**

```bash
pnpm build
```
Expected: build completes without errors. If `post.data.updated` type causes an error, check `src/content.config.ts` — the `updated` field should be typed as `z.coerce.date().optional()`, which means it can be `Date | undefined`, so the conditional is correct.

- [ ] **Step 4: Manually verify output in browser**

```bash
pnpm dev
```
Open a blog post in the browser. Open DevTools → Elements → `<head>`. Confirm:
- `og:type` is `article`
- `article:published_time` is present with an ISO date string
- `article:modified_time` is present only on posts that have an `updated` frontmatter field

- [ ] **Step 5: Commit**

```bash
git add src/components/PostHead.astro
git commit -m "feat(seo): set og:type to article and add published/modified timestamps"
```

---

### Task 5: Post-Deploy Verification

After deploying to production:

- [ ] **Step 1: Verify canonical URLs**

Visit any blog post (e.g. `https://blog.yuto0226.dev/blog/pwnabletw-start-writeup/`). View page source and confirm:
```html
<link rel="canonical" href="https://blog.yuto0226.dev/blog/pwnabletw-start-writeup/" />
```
The URL should match the page URL exactly, not the homepage.

- [ ] **Step 2: Verify robots.txt**

Visit `https://blog.yuto0226.dev/robots.txt` in a browser. It should display the file content.

- [ ] **Step 3: Request indexing in Google Search Console**

1. Go to Google Search Console
2. Paste the URL of a blog post into the top search bar
3. Click "Request Indexing"
4. Repeat for 2-3 posts to accelerate re-crawling

- [ ] **Step 4: Check Coverage report**

In Google Search Console → Indexing → Pages, verify posts are no longer listed under "Duplicate without user-selected canonical" or "Excluded" categories within 1-2 weeks.
