export type StructuredDataAuthor = {
  name: string
  url?: string
}

export type StructuredDataBreadcrumb = {
  name: string
  url: string
}

type WebSiteSchemaInput = {
  name: string
  url: string
}

type BlogPostingSchemaInput = {
  canonicalUrl: string
  headline: string
  description: string
  image: string
  datePublished: string
  dateModified?: string
  inLanguage: string
  authors: StructuredDataAuthor[]
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

export function buildWebSiteSchema({
  name,
  url,
}: WebSiteSchemaInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
  }
}

export function buildBlogPostingSchema({
  canonicalUrl,
  headline,
  description,
  image,
  datePublished,
  dateModified,
  inLanguage,
  authors,
}: BlogPostingSchemaInput): Record<string, unknown> {
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

export function buildBreadcrumbListSchema(
  breadcrumbs: StructuredDataBreadcrumb[],
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
