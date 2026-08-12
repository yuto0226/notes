import { getCollection, type CollectionEntry } from 'astro:content'

export async function getPublicEssays(): Promise<CollectionEntry<'essays'>[]> {
  const essays = await getCollection('essays')

  return essays
    .filter((essay) => !essay.data.draft)
    .toSorted((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
}
