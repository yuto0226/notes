import type { APIRoute, GetStaticPaths } from 'astro'
import type { CollectionEntry } from 'astro:content'
import { getEssayTranslation, getPublicEssays } from '@/lib/essays'
import { renderOgImageResponse } from '@/lib/og-image'

export const getStaticPaths: GetStaticPaths = async () => {
  const essays = await getPublicEssays()

  // Every essay this route generates an OG image for might also have a
  // real translation sibling, which getPublicEssays() deliberately excludes
  // for discovery purposes (archive, RSS, tags). PostHead builds the
  // translated page's og:image from the translation entry's own id, so that
  // id needs its own generated path here too, or the image 404s.
  const translations = (
    await Promise.all(
      essays.map((essay) => getEssayTranslation(essay.id, 'en')),
    )
  ).filter((entry): entry is CollectionEntry<'essays'> => entry !== null)

  return [...essays, ...translations].map((essay) => ({
    params: { id: essay.id },
    props: essay,
  }))
}

export const GET: APIRoute = async ({ props }) =>
  renderOgImageResponse(props as CollectionEntry<'essays'>, 'Essay')
