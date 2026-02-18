export type Site = {
  title: string
  description: string
  href: string
  author: string
  locale: string
  featuredPostCount: number
  postsPerPage: number
}

export type SocialLink = {
  href: string
  label: string
}

export type IconMap = {
  [key: string]: string
}

export type HeadingNode = {
  slug: string
  text: string
  depth: number
  children: HeadingNode[]
}

export type TOCStyleConfig = {
  text: string
  link: string
  linkDisabled: string
  border: string
  dot: string
}
