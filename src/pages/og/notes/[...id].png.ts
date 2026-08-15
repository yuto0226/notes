import type { APIRoute, GetStaticPaths } from 'astro'
import type { CollectionEntry } from 'astro:content'
import { getAllNotesAndSubposts } from '@/lib/data-utils'
import { getAllSeries } from '@/lib/series'
import { renderOgImageResponse } from '@/lib/og-image'

export const getStaticPaths: GetStaticPaths = async () => {
  const [notes, series] = await Promise.all([
    getAllNotesAndSubposts(),
    getAllSeries(),
  ])
  const seriesEntries = series.flatMap((s) => [...s.entries, ...s.subposts])

  return [...notes, ...seriesEntries].map((note) => ({
    params: { id: note.id },
    props: note,
  }))
}

export const GET: APIRoute = async ({ props }) =>
  renderOgImageResponse(props as CollectionEntry<'notes'>, 'Note')
