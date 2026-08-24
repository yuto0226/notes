import { ui as en } from './ui.en'
import { ui as zhTW } from './ui.zh-TW'

export const languages = {
  'zh-TW': '中文',
  en: 'English',
} as const

export const defaultLang = 'zh-TW'

export const ui = {
  'zh-TW': zhTW,
  en,
} as const

type Dictionary = (typeof ui)[typeof defaultLang]
type Key = keyof Dictionary

export function useTranslations(lang: string) {
  const dict =
    (ui as unknown as Record<string, Dictionary>)[lang] ?? ui[defaultLang]
  return function t(key: Key, params?: Record<string, string | number>) {
    const template = dict[key] ?? ui[defaultLang][key]
    if (!params) return template
    return Object.entries(params).reduce(
      (result, [k, v]) => result.replaceAll(`{${k}}`, String(v)),
      template as string,
    )
  }
}
