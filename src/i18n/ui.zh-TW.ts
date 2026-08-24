export const ui = {
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
  // Intentionally the same in every locale. "Present" for an ongoing
  // project/milestone isn't being translated, just kept out of two
  // hardcoded copies (ProjectCard, formatMilestoneDateRange).
  'common.present': 'Present',

  'home.recentEssays': '近期文章',
  'home.seeAll': '檢視全部 →',
  'home.pinnedPosts': '置頂文章',
  'home.latestNotes': '最新筆記',

  'series.empty': '此系列尚未發布任何筆記。',

  'about.projects': '專案',
  'about.projectsUntranslated':
    '部分專案內容尚未提供英文翻譯，未翻譯的項目顯示原文。',
  'about.milestones': '經歷',
  'about.milestonesUntranslated':
    '部分經歷內容尚未提供英文翻譯，未翻譯的項目顯示原文。',
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

  'footer.copyright': '© {year} 版權所有',
  'footer.madeWithPrefix': '此網站由',
  'footer.madeWithSuffix': '用 🤍 打造！',

  'post.readingTimeTotal': '（總計 {time}）',
  'post.subpostLabel': '篇子文章',
  'post.scrollToTop': '回到頂端',
  'post.untranslatedNotice': '這篇文章尚未提供英文版，以下為原文。',

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

  'reading.minRead': '閱讀約 {n} 分鐘',
} as const
