import type { APIRoute, GetStaticPaths } from 'astro'
import type { CollectionEntry } from 'astro:content'
import { getAllNotesAndSubposts, getNoteTranslation } from '@/lib/data-utils'
import { getAllSeries } from '@/lib/series'
import { renderOgImageResponse } from '@/lib/og-image'

export const getStaticPaths: GetStaticPaths = async () => {
  const [notes, series] = await Promise.all([
    getAllNotesAndSubposts(),
    getAllSeries(),
  ])
  const seriesEntries = series.flatMap((s) => [...s.entries, ...s.subposts])
  const allEntries = [...notes, ...seriesEntries]

  // Every note/subpost this route generates an OG image for might also have
  // a real translation sibling, which getAllNotesAndSubposts() deliberately
  // excludes for discovery purposes (archive, RSS, tags). PostHead builds
  // the translated page's og:image from the translation entry's own id, so
  // that id needs its own generated path here too, or the image 404s.
  const translations = (
    await Promise.all(
      allEntries.map((note) => getNoteTranslation(note.id, 'en')),
    )
  ).filter((entry): entry is CollectionEntry<'notes'> => entry !== null)

  return [...allEntries, ...translations].map((note) => ({
    params: { id: note.id },
    props: note,
  }))
}

export const GET: APIRoute = async ({ props }) =>
  renderOgImageResponse(props as CollectionEntry<'notes'>, 'Note')
