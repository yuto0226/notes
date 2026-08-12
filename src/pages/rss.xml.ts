import { SITE } from '@/consts'
import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { getAllPosts } from '@/lib/data-utils'
import { getPublicEssays } from '@/lib/essays'

export async function GET(context: APIContext) {
  try {
    const posts = await getAllPosts()
    const essays = await getPublicEssays()

    const items = [
      ...posts.map((post) => ({
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.date,
        link: `/blog/${post.id}/`,
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
