# SEO Indexing Fix Design

**Date:** 2026-04-06  
**Goal:** Fix the technical issues preventing blog posts from appearing in Google Search results.

## Background

The blog at `blog.yuto0226.dev` is built with Astro 5. Google Search Console is configured and the sitemap is submitted, but posts have never appeared in search results. Investigation revealed a critical canonical URL bug as the likely root cause, along with several missing SEO signals.

## Changes

### 1. Fix Canonical URL (Critical)

**Files:** `src/components/PageHead.astro`, `src/components/PostHead.astro`

Both components currently hardcode the canonical URL to the site homepage:
```html
<link rel="canonical" href={SITE.href} />
```

This tells Google that every page's authoritative URL is the homepage, causing all articles to be treated as duplicates and excluded from indexing.

**Fix:** Replace with the current page's actual URL:
```html
<link rel="canonical" href={Astro.url.href} />
```

### 2. Add robots.txt

**File:** `public/robots.txt` (new file)

Currently absent from the project. Add a standard `robots.txt` that permits all crawlers and explicitly references the sitemap:

```
User-agent: *
Allow: /

Sitemap: https://blog.yuto0226.dev/sitemap-index.xml
```

### 3. Fix og:type and Add Article Timestamps

**File:** `src/components/PostHead.astro`

- Change `og:type` from `website` to `article` for blog post pages
- Add `article:published_time` using `post.data.date`
- Add `article:modified_time` using `post.data.updated` (when present)

`PageHead.astro` keeps `og:type` as `website` — no change needed there.

## Out of Scope

- JSON-LD structured data (follow-up after indexing is confirmed working)
- Dynamic OG images (CTR improvement, not relevant to indexing)
- Keyword optimization or content strategy

## Success Criteria

- All blog post pages have correct canonical URLs pointing to themselves
- `robots.txt` is served at `https://blog.yuto0226.dev/robots.txt`
- Blog post pages include `og:type: article` and publication timestamps
- Posts begin appearing in Google Search results within a few weeks of deployment
