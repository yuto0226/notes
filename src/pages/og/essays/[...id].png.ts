import type { APIRoute, GetStaticPaths } from 'astro'
import type { CollectionEntry } from 'astro:content'
import { getPublicEssays } from '@/lib/essays'
import { renderOgImageResponse } from '@/lib/og-image'

export const getStaticPaths: GetStaticPaths = async () => {
  const essays = await getPublicEssays()
  return essays.map((essay) => ({
    params: { id: essay.id },
    props: essay,
  }))
}

export const GET: APIRoute = async ({ props }) =>
  renderOgImageResponse(props as CollectionEntry<'essays'>, 'Essay')
