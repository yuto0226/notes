import { getRelativeLocaleUrl } from 'astro:i18n'

import { defaultLang } from '@/i18n/ui'

export function getAlternateLocalePath(
  pathname: string,
  currentLocale: string,
): { locale: string; path: string } {
  if (currentLocale === 'en') {
    return { locale: 'zh-TW', path: pathname.replace(/^\/en(\/|$)/, '/') }
  }
  return { locale: 'en', path: pathname }
}

export function localeHref(locale: string, path: string): string {
  const normalized = path.replace(/^\//, '')
  if (locale === defaultLang) return `/${normalized}`
  return getRelativeLocaleUrl(locale, normalized)
}
