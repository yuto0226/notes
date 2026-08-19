const TRANSLATION_LOCALES = ['en']

// Astro's id generator slugifies each path segment, stripping the dot out
// of multi-dot filenames. So a translation id is `<id>.en` for a flat file
// or `<id>/en` for a directory note; `<id>/index.en` never appears.
export function isLocaleVariant(id: string): boolean {
  const lastSegment = id.split('/').pop() ?? id
  return TRANSLATION_LOCALES.some(
    (locale) => lastSegment === locale || lastSegment.endsWith(`.${locale}`),
  )
}
