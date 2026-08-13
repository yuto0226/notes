import { SITE } from '@/consts'
import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { getAllNotes } from '@/lib/data-utils'
import { getPublicEssays } from '@/lib/essays'

export async function GET(context: APIContext) {
  try {
    const notes = await getAllNotes()
    const essays = await getPublicEssays()

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
