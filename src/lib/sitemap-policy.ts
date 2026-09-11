import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

export type ContentCollection = 'notes' | 'essays'

function normalizePath(path: string): string {
  const withForwardSlashes = path.replaceAll('\\', '/')
  const withLeadingSlash = withForwardSlashes.startsWith('/')
    ? withForwardSlashes
    : `/${withForwardSlashes}`

  if (withLeadingSlash === '/') return withLeadingSlash
  return withLeadingSlash.replace(/\/+$/, '') + '/'
}

/**
 * Maps a source translation filename to the detail URL it translates.
 *
 * A flat source uses `<id>.en.md[x]`; directory sources use `<id>/en.md[x]`.
 * `index.en.md[x]` is deliberately not accepted because directory entries use
 * the latter form and Astro assigns the parent id to `index.md[x]`.
 */
export function translationSourceToPagePath(
  collection: ContentCollection,
  relativePath: string,
): string | null {
  const sourcePath = relativePath.replaceAll('\\', '/').replace(/^\/+/, '')
  const directoryTranslation = sourcePath.match(/^(.+)\/en\.(md|mdx)$/)
  const flatTranslation = sourcePath.match(/^(.+)\.en\.(md|mdx)$/)
  const sourceId = directoryTranslation?.[1] ?? flatTranslation?.[1]

  if (!sourceId || sourceId.endsWith('/index') || sourceId === 'index') {
    return null
  }

  return normalizePath(`/en/${collection}/${sourceId}`)
}

function collectTranslationPaths(
  collection: ContentCollection,
  collectionRoot: string,
  directory = collectionRoot,
): Set<string> {
  const translatedPagePaths = new Set<string>()

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)

    if (entry.isDirectory()) {
      for (const path of collectTranslationPaths(
        collection,
        collectionRoot,
        entryPath,
      )) {
        translatedPagePaths.add(path)
      }
      continue
    }

    if (!entry.isFile()) continue

    const relativePath = relative(collectionRoot, entryPath)
      .split(sep)
      .join('/')
    const pagePath = translationSourceToPagePath(collection, relativePath)
    if (pagePath) translatedPagePaths.add(pagePath)
  }

  return translatedPagePaths
}

/** Recursively finds translated Note and Essay detail paths below contentRoot. */
export function discoverTranslatedPagePaths(
  contentRoot: string,
): ReadonlySet<string> {
  const translatedPagePaths = new Set<string>()

  for (const collection of ['notes', 'essays'] as const) {
    const collectionRoot = join(contentRoot, collection)
    if (!statSync(collectionRoot, { throwIfNoEntry: false })?.isDirectory()) {
      continue
    }

    for (const pagePath of collectTranslationPaths(
      collection,
      collectionRoot,
    )) {
      translatedPagePaths.add(pagePath)
    }
  }

  return translatedPagePaths
}

function isRootCollectionPath(segments: string[], collection: string): boolean {
  return (
    segments.length === 2 && segments[0] === 'en' && segments[1] === collection
  )
}

function isEnglishCollectionPath(
  segments: string[],
  collection: string,
): boolean {
  return segments[0] === 'en' && segments[1] === collection
}

/** Applies the indexability policy to a generated sitemap URL. */
export function shouldIncludeSitemapPage(
  page: string,
  translatedPagePaths: ReadonlySet<string>,
): boolean {
  const pathname = normalizePath(new URL(page).pathname)
  const segments = pathname.split('/').filter(Boolean)

  if (pathname === '/404/' || pathname === '/en/404/') return false

  const routeRoot = segments[0] === 'en' ? 1 : 0
  const routeFamily = segments[routeRoot]
  const hasRouteDetail = segments.length > routeRoot + 1
  if ((routeFamily === 'tags' || routeFamily === 'authors') && hasRouteDetail) {
    return false
  }

  for (const collection of ['notes', 'essays']) {
    if (!isEnglishCollectionPath(segments, collection)) continue
    if (isRootCollectionPath(segments, collection)) return true

    const pageSegment = segments[2]
    if (segments.length === 3 && pageSegment && /^\d+$/.test(pageSegment)) {
      return true
    }

    return translatedPagePaths.has(pathname)
  }

  return true
}
