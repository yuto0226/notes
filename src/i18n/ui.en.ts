import type { ui as zhTW } from './ui.zh-TW'

// `satisfies` (not `: Record<...>`) keeps each value's literal type while
// still forcing this object to have exactly the same keys as ui.zh-TW.ts.
export const ui = {
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
  'common.present': 'Present',

  'home.recentEssays': 'Recent Essays',
  'home.seeAll': 'See all →',
  'home.pinnedPosts': 'Pinned posts',
  'home.latestNotes': 'Latest Notes',

  'series.empty': 'No notes have been published in this series yet.',

  'about.projects': 'Projects',
  'about.projectsUntranslated':
    "Some projects haven't been translated into English yet. Those are shown in the original.",
  'about.milestones': 'Milestones',
  'about.milestonesUntranslated':
    "Some milestones haven't been translated into English yet. Those are shown in the original.",
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
  'post.untranslatedNotice':
    "This post hasn't been translated into English yet. Showing the original.",

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
} as const satisfies Record<keyof typeof zhTW, string>
