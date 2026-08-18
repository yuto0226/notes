export function getAlternateLocalePath(
  pathname: string,
  currentLocale: string,
): { locale: string; path: string } {
  if (currentLocale === 'en') {
    return { locale: 'zh-TW', path: pathname.replace(/^\/en(\/|$)/, '/') }
  }
  return { locale: 'en', path: pathname }
}
