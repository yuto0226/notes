import { SITE } from '@/consts'
import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { getAllNotes } from '@/lib/data-utils'
import { getPublicEssays } from '@/lib/essays'
import { getAllSeries } from '@/lib/series'

export async function GET(context: APIContext) {
  try {
    const [notes, essays, series] = await Promise.all([
      getAllNotes(),
      getPublicEssays(),
      getAllSeries(),
    ])

    const items = [
      ...notes.map((note) => ({
        title: note.data.title,
        description: note.data.description,
        pubDate: note.data.date,
        link: `/notes/${note.id}/`,
      })),
      ...essays.map((essay) => ({
        title: essay.data.title,
        description: essay.data.description,
        pubDate: essay.data.date,
        link: `/essays/${essay.id}/`,
      })),
      ...series.flatMap(({ parent, entries }) => [
        {
          title: parent.data.title,
          description: parent.data.description,
          pubDate: parent.data.date,
          link: `/notes/${parent.id}/`,
        },
        ...entries.map((entry) => ({
          title: entry.data.title,
          description: entry.data.description,
          pubDate: entry.data.date,
          link: `/notes/${entry.id}/`,
        })),
      ]),
    ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf())

    return rss({
      title: SITE.title,
      description: SITE.description,
      site: context.site ?? SITE.href,
      items,
    })
  } catch (error) {
    console.error('Error generating RSS feed:', error)
    return new Response('Error generating RSS feed', { status: 500 })
  }
}
