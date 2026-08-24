import { getCollection, type CollectionEntry } from 'astro:content'
import { isLocaleVariant } from '@/lib/locale-variant'

export async function getPublicEssays(): Promise<CollectionEntry<'essays'>[]> {
  const essays = await getCollection('essays')
  const publicEssays = essays.filter(
    (essay) => !essay.data.draft && !isLocaleVariant(essay.id),
  )
  const numericEssay = publicEssays.find((essay) => /^\d+$/.test(essay.id))

  if (numericEssay) {
    throw new Error(
      `Numeric Essay IDs are reserved for pagination: ${numericEssay.id}`,
    )
  }

  return publicEssays.toSorted(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  )
}

export async function getEssayTranslation(
  canonicalId: string,
  targetLocale: string,
): Promise<CollectionEntry<'essays'> | null> {
  const flatId = `${canonicalId}.${targetLocale}`
  const dirId = `${canonicalId}/${targetLocale}`
  const essays = await getCollection('essays')
  const translation = essays.find(
    (essay) => (essay.id === flatId || essay.id === dirId) && !essay.data.draft,
  )
  return translation ?? null
}

export type DisplayEssay = {
  entry: CollectionEntry<'essays'>
  isTranslated: boolean
  hasTranslation: boolean
}

// Single entry point for "what should render for this essay under the
// current locale" (title, description, image, authors, ...). Every card
// or detail view should read display data through this instead of
// branching on getEssayTranslation() itself, so a translated essay is
// resolved the same way everywhere.
export async function getDisplayEssay(
  entry: CollectionEntry<'essays'>,
  locale: string,
): Promise<DisplayEssay> {
  const translation = await getEssayTranslation(entry.id, 'en')
  const isTranslated = locale === 'en' && translation !== null
  return {
    entry: isTranslated ? translation! : entry,
    isTranslated,
    hasTranslation: translation !== null,
  }
}
