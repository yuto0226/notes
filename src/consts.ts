import type { IconMap, SocialLink, Site } from '@/types'

export const SITE: Site = {
  title: 'Yuto\'s Notes',
  description:
    'Yuto 筆記、writeups 和部落格文章們',
  href: 'https://blog.yuto0226.dev',
  author: 'Yuto',
  locale: 'zh-TW',
  featuredPostCount: 2,
  postsPerPage: 5,
}

export const NAV_LINKS: SocialLink[] = [
  {
    href: '/blog',
    label: 'blog',
  },
  // {
  //   href: '/authors',
  //   label: 'authors',
  // },
  {
    href: '/about',
    label: 'about',
  },
  {
    href: '/friends',
    label: 'friends',
  },
]

export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: 'https://github.com/yuto0226',
    label: 'GitHub',
  },
  {
    href: 'https://instagram.com/sw_1a4',
    label: 'Instagram',
  },
  {
    href: 'mailto:me@yuto0226.dev',
    label: 'Email',
  },
  {
    href: '/rss.xml',
    label: 'RSS',
  },
]

export const ICON_MAP: IconMap = {
  Website: 'lucide:globe',
  GitHub: 'lucide:github',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:twitter',
  Instagram: 'lucide:instagram',
  Email: 'lucide:mail',
  RSS: 'lucide:rss',
}
