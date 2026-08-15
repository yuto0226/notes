import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { CollectionEntry } from 'astro:content'
import type { ReactNode } from 'react'
import satori, { type FontWeight } from 'satori'
import sharp from 'sharp'
import { decompress as decompressWoff2 } from 'wawoff2'
import { SITE } from '@/consts'
import { parseAuthors } from '@/lib/data-utils'

const WIDTH = 1200
const HEIGHT = 630

// Matches global.css light-mode palette (oklch converted to sRGB).
const PAPER = '#f8f8f8'
const INK = '#1b1b1b'
const MUTED_INK = '#696969'
const ACCENT_SOLID = '#8a6bab'
const ACCENT_WASH = 'rgba(138, 107, 171, 0.35)'

// Google Fonts serves TTF instead of WOFF2 to old user agents (e.g. Chrome
// 41); satori's font parser can't read WOFF2.
const LEGACY_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'

// Google Fonts splits CJK families into per-unicode-range files. `text=`
// returns just the one file covering the glyphs this image needs.
async function fetchGoogleFontTtf(
  family: string,
  weight: number,
  text: string,
): Promise<Buffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`
  const css = await fetch(cssUrl, {
    headers: { 'User-Agent': LEGACY_USER_AGENT },
  }).then((res) => res.text())

  const fontUrl = css.match(/src: url\(([^)]+)\)/)?.[1]
  if (!fontUrl) {
    throw new Error(`Could not resolve a TTF source for "${family}" ${weight}`)
  }

  const buffer = await fetch(fontUrl).then((res) => res.arrayBuffer())
  return Buffer.from(buffer)
}

// GenWanMinTW (global.css --font-serif's CJK font) isn't on Google Fonts
// and has no `text=` subsetting, so its CSS is parsed manually: keep only
// the unicode-range blocks covering the needed CJK characters, then
// decompress those WOFF2 files to TTF.
type FontFaceBlock = { url: string; ranges: [number, number][] }

function parseUnicodeRange(raw: string): [number, number][] {
  return raw.split(',').map((part) => {
    const token = part.trim().replace(/^U\+/i, '')
    if (token.includes('-')) {
      const [start, end] = token.split('-')
      return [parseInt(start, 16), parseInt(end, 16)]
    }
    if (token.includes('?')) {
      return [
        parseInt(token.replace(/\?/g, '0'), 16),
        parseInt(token.replace(/\?/g, 'F'), 16),
      ]
    }
    const value = parseInt(token, 16)
    return [value, value]
  })
}

function parseFontFaceBlocks(css: string): FontFaceBlock[] {
  const blocks: FontFaceBlock[] = []
  for (const match of css.matchAll(/@font-face\s*{([^}]*)}/g)) {
    const body = match[1]
    const url = body.match(/src:\s*url\(['"]?([^'")]+)['"]?\)/)?.[1]
    const rangeRaw = body.match(/unicode-range:\s*([^;]+);/)?.[1]
    if (url && rangeRaw) {
      blocks.push({ url, ranges: parseUnicodeRange(rangeRaw) })
    }
  }
  return blocks
}

async function fetchGenWanTtfs(
  text: string,
  weight: number,
): Promise<Buffer[]> {
  // Basic Latin is covered by Literata; only look up CJK glyphs here.
  const codepoints = [
    ...new Set(Array.from(text, (ch) => ch.codePointAt(0) ?? 0)),
  ].filter((cp) => cp > 0x2e80)
  if (!codepoints.length) return []

  const css = await fetch(
    `https://font.emtech.cc/css/GenWanMinTW/${weight}`,
  ).then((res) => res.text())
  const blocks = parseFontFaceBlocks(css)

  const neededUrls = new Set<string>()
  for (const cp of codepoints) {
    const block = blocks.find((b) =>
      b.ranges.some(([start, end]) => cp >= start && cp <= end),
    )
    if (block) neededUrls.add(block.url)
  }

  return Promise.all(
    [...neededUrls].map(async (url) => {
      const woff2Bytes = Buffer.from(
        await fetch(url).then((res) => res.arrayBuffer()),
      )
      return Buffer.from(await decompressWoff2(woff2Bytes))
    }),
  )
}

// Geist is read once from src/assets/fonts/: it's self-hosted by the site
// itself (not on Google Fonts), used on every render, and a WOFF2->TTF
// conversion isn't something to redo per build.
let geistPromise: Promise<{ regular: Buffer; bold: Buffer }> | null = null

function loadGeist(): Promise<{ regular: Buffer; bold: Buffer }> {
  if (!geistPromise) {
    const fontPath = (name: string) =>
      path.resolve(process.cwd(), 'src/assets/fonts', name)
    geistPromise = Promise.all([
      readFile(fontPath('geist-og-400.ttf')),
      readFile(fontPath('geist-og-700.ttf')),
    ]).then(([regular, bold]) => ({ regular, bold }))
  }
  return geistPromise
}

async function loadAvatarDataUri(avatarPath: string): Promise<string | null> {
  try {
    const bytes = /^https?:\/\//.test(avatarPath)
      ? Buffer.from(await fetch(avatarPath).then((res) => res.arrayBuffer()))
      : await readFile(
          path.resolve(process.cwd(), 'public', avatarPath.replace(/^\//, '')),
        )

    const resized = await sharp(bytes)
      .resize(96, 96, { fit: 'cover' })
      .png()
      .toBuffer()
    return `data:image/png;base64,${resized.toString('base64')}`
  } catch {
    return null
  }
}

// satori accepts plain {type, props} element trees; it only types its input
// as React's ReactNode for JSX ergonomics.
type SatoriNode = {
  type: string
  props: {
    style?: Record<string, string | number>
    children?: SatoriNode | SatoriNode[] | string
    [attr: string]: unknown
  }
}

// Same icons as the site's breadcrumbs: lucide:library-big for Notes,
// lucide:feather for Essays.
function libraryBigIcon(color: string, size: number): SatoriNode {
  return {
    type: 'svg',
    props: {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      children: [
        {
          type: 'rect',
          props: { width: 8, height: 18, x: 3, y: 3, rx: 1 },
        },
        { type: 'path', props: { d: 'M7 3v18' } },
        {
          type: 'path',
          props: {
            d: 'M20.4 18.9c.2.5-.1 1.1-.6 1.3l-1.9.7c-.5.2-1.1-.1-1.3-.6L11.1 5.1c-.2-.5.1-1.1.6-1.3l1.9-.7c.5-.2 1.1.1 1.3.6Z',
          },
        },
      ],
    },
  }
}

function featherIcon(color: string, size: number): SatoriNode {
  return {
    type: 'svg',
    props: {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      children: [
        {
          type: 'path',
          props: {
            d: 'M14.086 18.412A2 2 0 0112.67 19H5v-7.672a2 2 0 01.586-1.414L11.75 3.75a6 6 0 118.49 8.49z',
          },
        },
        { type: 'path', props: { d: 'M16 8 2 22' } },
        { type: 'path', props: { d: 'M17.488 15H9' } },
      ],
    },
  }
}

// Satori has no line-box API, so a highlighter mark can't just be one
// background behind wrapped text. Instead the text is split into wrap-safe
// tokens (Latin runs stay one word, CJK wraps per character) and rendered
// as flex-wrap items, each with its own mark; wherever the line wraps, a
// new mark starts. Trailing whitespace is kept inside the token's own text
// (not a margin between tokens) so a line reads as one continuous stroke.
function tokenizeForHighlight(text: string): { text: string; cjk: boolean }[] {
  const tokens: { text: string; cjk: boolean }[] = []
  for (const match of text.matchAll(/([A-Za-z0-9'&:,.!?-]+|[^\s])(\s*)/g)) {
    const core = match[1]
    const cjk = core.length === 1 && /[^\x00-\x7F]/.test(core)
    // NBSP: a trailing plain space at the end of a text node gets collapsed.
    tokens.push({ text: core + (match[2] ? ' ' : ''), cjk })
  }
  return tokens
}

function highlightedTitle(text: string, fontFamily: string): SatoriNode {
  const rawTokens = tokenizeForHighlight(text)
  const tokens = rawTokens.map(
    ({ text: token, cjk }, i): SatoriNode => ({
      type: 'div',
      props: {
        style: {
          position: 'relative',
          display: 'flex',
          padding: cjk ? '0px 1px 0px 1px' : '0px',
          marginBottom: 1,
        },
        children: [
          // Thin band under the lower part of the glyphs, not a full-height
          // box. Only the first token rounds its left edge — rounding every
          // token would notch the seam between adjacent words on a line.
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 4,
                height: 38,
                borderTopLeftRadius: i === 0 ? 2 : 0,
                borderBottomLeftRadius: i === 0 ? 2 : 0,
                backgroundColor: ACCENT_WASH,
              },
            },
          },
          {
            type: 'div',
            props: {
              style: { position: 'relative', display: 'flex' },
              children: token,
            },
          },
        ],
      },
    }),
  )

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        color: INK,
        fontFamily,
        fontSize: 58,
        fontWeight: 700,
        lineHeight: 1.02,
        maxHeight: 270,
        overflow: 'hidden',
        marginLeft: -3,
      },
      children: tokens,
    },
  }
}

type OgImageInput = {
  type: 'Note' | 'Essay'
  title: string
  description: string
  authorName: string
  avatarDataUri: string | null
  date: Date
  tags: string[]
}

async function buildOgSvg(input: OgImageInput) {
  const dateText = input.date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const tagsText = input.tags
    .slice(0, 3)
    .map((t) => `#${t}`)
    .join('  ')

  // Noto Sans TC also covers the title: GenWanMinTW's unicode-range blocks
  // are matched per character and may miss some, so Noto is a full fallback.
  const notoText = [
    SITE.title,
    input.type,
    input.description,
    input.authorName,
    dateText,
    tagsText,
    input.title,
  ].join('')
  // Literata (Latin) + GenWanMinTW (CJK) is the site serif heading pair,
  // see global.css --font-serif.
  const serifText = SITE.title + input.title
  const GENWAN_WEIGHT = 600

  const [geist, notoRegular, notoBold, literata, genwan] = await Promise.all([
    loadGeist(),
    fetchGoogleFontTtf('Noto Sans TC', 400, notoText),
    fetchGoogleFontTtf('Noto Sans TC', 700, notoText),
    fetchGoogleFontTtf('Literata', 700, serifText),
    fetchGenWanTtfs(serifText, GENWAN_WEIGHT),
  ])

  // Each GenWanMinTW subset gets its own family name — satori keeps only
  // the last font registered per {name, weight, style}, so several buffers
  // sharing one name would silently drop all but one.
  const serifFontFamily = [
    'Literata',
    ...genwan.map((_, i) => `GenWanMinTW-${i}`),
    'Geist',
    'Noto Sans TC',
  ].join(', ')

  const icon = input.type === 'Note' ? libraryBigIcon : featherIcon

  const root: SatoriNode = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        padding: '68px 72px',
        backgroundColor: PAPER,
        fontFamily: 'Geist, Noto Sans TC',
      },
      children: [
        // header: wordmark only
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: INK,
              fontFamily: serifFontFamily,
              fontSize: 30,
              fontWeight: 700,
            },
            children: SITE.title,
          },
        },
        // kicker (icon + type), title, description — centered in the space
        // between the wordmark and footer, biased upward by uneven padding
        {
          type: 'div',
          props: {
            style: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              maxWidth: 1020,
              paddingTop: 20,
              paddingBottom: 60,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 20,
                  },
                  children: [
                    icon(ACCENT_SOLID, 34),
                    {
                      type: 'div',
                      props: {
                        style: {
                          color: ACCENT_SOLID,
                          fontSize: 28,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                        },
                        children: input.type,
                      },
                    },
                  ],
                },
              },
              highlightedTitle(input.title, serifFontFamily),
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    color: MUTED_INK,
                    fontSize: 24,
                    lineHeight: 1.5,
                    marginTop: 22,
                    maxHeight: 76,
                    overflow: 'hidden',
                  },
                  children: input.description,
                },
              },
            ],
          },
        },
        // footer: avatar + author left, tags + date right
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: { display: 'flex', alignItems: 'center', gap: 14 },
                  children: [
                    ...(input.avatarDataUri
                      ? [
                          {
                            type: 'img',
                            props: {
                              src: input.avatarDataUri,
                              width: 48,
                              height: 48,
                              style: { borderRadius: 999 },
                            },
                          } satisfies SatoriNode,
                        ]
                      : []),
                    {
                      type: 'div',
                      props: {
                        style: { color: INK, fontSize: 24, fontWeight: 700 },
                        children: input.authorName,
                      },
                    },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: { display: 'flex', color: MUTED_INK, fontSize: 22 },
                  children: tagsText
                    ? `${tagsText}   ·   ${dateText}`
                    : dateText,
                },
              },
            ],
          },
        },
      ],
    },
  }

  return satori(root as unknown as ReactNode, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Geist', data: geist.regular, weight: 400, style: 'normal' },
      { name: 'Geist', data: geist.bold, weight: 700, style: 'normal' },
      { name: 'Noto Sans TC', data: notoRegular, weight: 400, style: 'normal' },
      { name: 'Noto Sans TC', data: notoBold, weight: 700, style: 'normal' },
      { name: 'Literata', data: literata, weight: 700, style: 'normal' },
      ...genwan.map((data, i) => ({
        name: `GenWanMinTW-${i}`,
        data,
        weight: GENWAN_WEIGHT as FontWeight,
        style: 'normal' as const,
      })),
    ],
  })
}

async function renderOgImage(
  entry: CollectionEntry<'notes'> | CollectionEntry<'essays'>,
  type: 'Note' | 'Essay',
): Promise<Buffer> {
  const authors = await parseAuthors(entry.data.authors ?? [])
  const primaryAuthor = authors[0]

  const avatarDataUri = primaryAuthor
    ? await loadAvatarDataUri(primaryAuthor.avatar)
    : null

  const svg = await buildOgSvg({
    type,
    title: entry.data.title,
    description: entry.data.description,
    authorName: primaryAuthor?.name ?? SITE.author,
    avatarDataUri,
    date: entry.data.date,
    tags: entry.data.tags ?? [],
  })

  return sharp(Buffer.from(svg)).png().toBuffer()
}

// Shared by src/pages/og/notes/[...id].png.ts and .../essays/[...id].png.ts.
// Short max-age, not `immutable`: the URL is keyed by post id, not a
// content hash, so an edited title/tags reuses the same URL.
export async function renderOgImageResponse(
  entry: CollectionEntry<'notes'> | CollectionEntry<'essays'>,
  type: 'Note' | 'Essay',
): Promise<Response> {
  const png = await renderOgImage(entry, type)
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
