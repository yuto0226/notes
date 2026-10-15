export type Author = {
  name: string
  url?: string
}

export type Breadcrumb = {
  name: string
  url: string
}

type WebsiteInput = {
  name: string
  alternateNames: string[]
  url: string
}

type BlogPostingInput = {
  canonicalUrl: string
  headline: string
  description: string
  image: string
  datePublished: string
  dateModified?: string
  inLanguage: string
  authors: Author[]
}

export function stringify(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

export function website({
  name,
  alternateNames,
  url,
}: WebsiteInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    alternateName: alternateNames,
    url,
  }
}

export function blogPosting({
  canonicalUrl,
  headline,
  description,
  image,
  datePublished,
  dateModified,
  inLanguage,
  authors,
}: BlogPostingInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline,
    description,
    image,
    datePublished,
    ...(dateModified ? { dateModified } : {}),
    inLanguage,
    mainEntityOfPage: canonicalUrl,
    author: authors.map((author) => ({
      '@type': 'Person',
      ...author,
    })),
  }
}

export function breadcrumbList(
  breadcrumbs: Breadcrumb[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map(({ name, url }, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: url,
    })),
  }
}
