export const languages = {
  'zh-TW': '中文',
  en: 'English',
} as const

export const defaultLang = 'zh-TW'

export const ui = {
  'zh-TW': {
    'nav.essays': '文章',
    'nav.notes': '筆記',
    'nav.about': '關於',

    'common.home': '首頁',
    'common.essays': '文章',
    'common.notes': '筆記',
    'common.tags': '標籤',
    'common.authors': '作者',
    'common.about': '關於',
    'common.page': '第 {n} 頁',
    'common.pagedTitle': '{title} — 第 {n} 頁',

    'home.recentEssays': '近期文章',
    'home.seeAll': '查看全部 →',
    'home.pinnedPosts': '置頂文章',
    'home.latestNotes': '最新筆記',

    'about.projects': '專案',
    'about.milestones': '經歷',
    'about.friends': '朋友',
    'about.noFriends': '找不到朋友。｡ﾟヽ(ﾟ´Д`)ﾉﾟ｡',

    'notfound.heading': '404：找不到頁面',
    'notfound.body': '啊咧，你要找的頁面不存在。',
    'notfound.goHome': '回首頁',
    'notfound.breadcrumb': '???',

    'tags.pageTitle': '標記為「{tag}」的文章',
    'tags.pageDescription': '標記為 {tag} 的文章合集。',

    'authors.essaysBy': '{name} 的文章',
    'authors.notesBy': '{name} 的筆記',
    'authors.noEssays': '這位作者目前沒有文章。',
    'authors.noNotes': '這位作者目前沒有筆記。',
    'authors.noAuthors': '找不到作者。',

    'essays.noEntries': '想法還在腦中，靜靜等待成為文字。',
    'essays.description': '個人的反思、日常生活、旅行與零碎的想法。',

    'footer.copyright': '© {year} 版權所有。',
    'footer.madeWithPrefix': '此網站由',
    'footer.madeWithSuffix': '用 🤍 打造！',

    'post.readingTimeTotal': '（總計 {time}）',
    'post.subpostLabel': '篇子文章',
    'post.scrollToTop': '回到頂端',

    'postnav.previousPost': '上一篇',
    'postnav.nextPost': '下一篇',
    'postnav.previousSubpost': '上一個子文章',
    'postnav.nextSubpost': '下一個子文章',
    'postnav.parentPost': '上層文章',
    'postnav.noOlderSubpost': '沒有更舊的子文章',
    'postnav.noOldestPost': '這已經是最舊的文章了！',
    'postnav.noNewerSubpost': '沒有更新的子文章',
    'postnav.noNewestPost': '這已經是最新的文章了！',
    'postnav.noParentPost': '沒有上層文章',

    'pagination.previous': '上一頁',
    'pagination.next': '下一頁',
    'pagination.goToPrevious': '前往上一頁',
    'pagination.goToNext': '前往下一頁',
    'pagination.morePages': '更多頁面',
    'pagination.nav': '分頁',

    'reading.minRead': '{n} 分鐘閱讀',
  },
  en: {
    'nav.essays': 'Essays',
    'nav.notes': 'Notes',
    'nav.about': 'About',

    'common.home': 'Home',
    'common.essays': 'Essays',
    'common.notes': 'Notes',
    'common.tags': 'Tags',
    'common.authors': 'Authors',
    'common.about': 'About',
    'common.page': 'Page {n}',
    'common.pagedTitle': '{title} — Page {n}',

    'home.recentEssays': 'Recent Essays',
    'home.seeAll': 'See all →',
    'home.pinnedPosts': 'Pinned posts',
    'home.latestNotes': 'Latest Notes',

    'about.projects': 'Projects',
    'about.milestones': 'Milestones',
    'about.friends': 'Friends',
    'about.noFriends': 'No friends found. ｡ﾟヽ(ﾟ´Д`)ﾉﾟ｡',

    'notfound.heading': '404: Page not found',
    'notfound.body': "Oops! The page you're looking for doesn't exist.",
    'notfound.goHome': 'Go to home page',
    'notfound.breadcrumb': '???',

    'tags.pageTitle': 'Posts tagged with "{tag}"',
    'tags.pageDescription': 'A collection of posts tagged with {tag}.',

    'authors.essaysBy': 'Essays by {name}',
    'authors.notesBy': 'Notes by {name}',
    'authors.noEssays': 'No essays available from this author.',
    'authors.noNotes': 'No notes available from this author.',
    'authors.noAuthors': 'No authors found.',

    'essays.noEntries':
      'The thoughts are still in mind, waiting quietly to become words.',
    'essays.description':
      'Personal reflections, daily life, travel, and brief ideas.',

    'footer.copyright': '© {year} All rights reserved.',
    'footer.madeWithPrefix': 'Made with 🤍 by',
    'footer.madeWithSuffix': '!',

    'post.readingTimeTotal': '({time} total)',
    'post.subpostLabel': 'subpost',
    'post.scrollToTop': 'Scroll to top',

    'postnav.previousPost': 'Previous Post',
    'postnav.nextPost': 'Next Post',
    'postnav.previousSubpost': 'Previous Subpost',
    'postnav.nextSubpost': 'Next Subpost',
    'postnav.parentPost': 'Parent Post',
    'postnav.noOlderSubpost': 'No older subpost',
    'postnav.noOldestPost': "You're at the oldest post!",
    'postnav.noNewerSubpost': 'No newer subpost',
    'postnav.noNewestPost': "You're at the newest post!",
    'postnav.noParentPost': 'No parent post',

    'pagination.previous': 'Previous',
    'pagination.next': 'Next',
    'pagination.goToPrevious': 'Go to previous page',
    'pagination.goToNext': 'Go to next page',
    'pagination.morePages': 'More pages',
    'pagination.nav': 'pagination',

    'reading.minRead': '{n} min read',
  },
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
