import { getCollection, type CollectionEntry } from 'astro:content'

export async function getPublicEssays(): Promise<CollectionEntry<'essays'>[]> {
  const essays = await getCollection('essays')
  const publicEssays = essays.filter((essay) => !essay.data.draft)
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
