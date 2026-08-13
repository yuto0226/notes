import { getCollection, type CollectionEntry } from 'astro:content'
import { getPublicEssays } from '@/lib/essays'
import { parseMilestoneDate } from '@/lib/milestones'
import { isSeriesEntry } from '@/lib/series'
import { readingTime, calculateWordCountFromHtml } from '@/lib/utils'

export type TagEntry = CollectionEntry<'notes'> | CollectionEntry<'essays'>

export async function getAllAuthors(): Promise<CollectionEntry<'authors'>[]> {
  return await getCollection('authors')
}

export async function getAllFriends(): Promise<CollectionEntry<'friends'>[]> {
  return await getCollection('friends')
}

export async function getAllNotes(): Promise<CollectionEntry<'notes'>[]> {
  const notes = await getCollection('notes')
  return notes
    .filter(
      (note) =>
        !note.data.draft && !isSeriesEntry(note.id) && !isSubpost(note.id),
    )
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
}

export async function getPinnedNotes(): Promise<CollectionEntry<'notes'>[]> {
  const notes = await getAllNotes()
  return notes.filter((note) => note.data.pinned === true)
}

export async function getRegularNotes(): Promise<CollectionEntry<'notes'>[]> {
  const notes = await getAllNotes()
  return notes.filter((note) => !note.data.pinned)
}

export async function getAllNotesAndSubposts(): Promise<
  CollectionEntry<'notes'>[]
> {
  const notes = await getCollection('notes')
  return notes
    .filter((note) => !note.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
}

export async function getAllProjects(): Promise<CollectionEntry<'projects'>[]> {
  const projects = await getCollection('projects')
  return projects.sort((a, b) => {
    const dateA = a.data.startDate?.getTime() || 0
    const dateB = b.data.startDate?.getTime() || 0
    return dateB - dateA
  })
}

export async function getAllMilestones(): Promise<
  CollectionEntry<'milestones'>[]
> {
  const milestones = await getCollection('milestones')
  return milestones
    .filter((milestone) => !milestone.data.draft)
    .sort(
      (a, b) =>
        parseMilestoneDate(b.data.startDate).value.valueOf() -
        parseMilestoneDate(a.data.startDate).value.valueOf(),
    )
}

export async function getAllTags(): Promise<Map<string, number>> {
  const entries = await getAllTagEntries()
  return entries.reduce((acc, entry) => {
    entry.data.tags?.forEach((tag) => {
      acc.set(tag, (acc.get(tag) || 0) + 1)
    })
    return acc
  }, new Map<string, number>())
}

export async function getEntriesByTag(tag: string): Promise<TagEntry[]> {
  const entries = await getAllTagEntries()
  return entries.filter((entry) => entry.data.tags?.includes(tag))
}

async function getAllTagEntries(): Promise<TagEntry[]> {
  const [notes, essays] = await Promise.all([getAllNotes(), getPublicEssays()])

  return [...notes, ...essays].toSorted(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  )
}

export async function getAdjacentNotes(currentId: string): Promise<{
  newer: CollectionEntry<'notes'> | null
  older: CollectionEntry<'notes'> | null
  parent: CollectionEntry<'notes'> | null
}> {
  const allNotes = await getAllNotes()

  if (isSubpost(currentId)) {
    const parentId = getParentId(currentId)
    const allNotes = await getAllNotes()
    const parent = allNotes.find((note) => note.id === parentId) || null

    const notes = await getCollection('notes')
    const subposts = notes
      .filter(
        (note) =>
          isSubpost(note.id) &&
          getParentId(note.id) === parentId &&
          !note.data.draft,
      )
      .sort((a, b) => {
        const dateDiff = a.data.date.valueOf() - b.data.date.valueOf()
        if (dateDiff !== 0) return dateDiff

        const orderA = a.data.order ?? 0
        const orderB = b.data.order ?? 0
        return orderA - orderB
      })

    const currentIndex = subposts.findIndex((post) => post.id === currentId)
    if (currentIndex === -1) {
      return { newer: null, older: null, parent }
    }

    return {
      newer:
        currentIndex < subposts.length - 1 ? subposts[currentIndex + 1] : null,
      older: currentIndex > 0 ? subposts[currentIndex - 1] : null,
      parent,
    }
  }

  const parentNotes = allNotes.filter((note) => !isSubpost(note.id))
  const currentIndex = parentNotes.findIndex((note) => note.id === currentId)

  if (currentIndex === -1) {
    return { newer: null, older: null, parent: null }
  }

  return {
    newer: currentIndex > 0 ? parentNotes[currentIndex - 1] : null,
    older:
      currentIndex < parentNotes.length - 1
        ? parentNotes[currentIndex + 1]
        : null,
    parent: null,
  }
}

export async function getNotesByAuthor(
  authorId: string,
): Promise<CollectionEntry<'notes'>[]> {
  const notes = await getAllNotes()
  return notes.filter((note) => note.data.authors?.includes(authorId))
}

export async function getNotesByTag(
  tag: string,
): Promise<CollectionEntry<'notes'>[]> {
  const notes = await getAllNotes()
  return notes.filter((note) => note.data.tags?.includes(tag))
}

export async function getRecentNotes(
  count: number,
): Promise<CollectionEntry<'notes'>[]> {
  const notes = await getAllNotes()
  return notes.slice(0, count)
}

export async function getSortedTags(): Promise<
  { tag: string; count: number }[]
> {
  const tagCounts = await getAllTags()
  return [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => {
      const countDiff = b.count - a.count
      return countDiff !== 0 ? countDiff : a.tag.localeCompare(b.tag)
    })
}

export function getParentId(subpostId: string): string {
  return subpostId.split('/')[0]
}

export async function getSubpostsForParent(
  parentId: string,
): Promise<CollectionEntry<'notes'>[]> {
  const notes = await getCollection('notes')
  return notes
    .filter(
      (note) =>
        !note.data.draft &&
        isSubpost(note.id) &&
        getParentId(note.id) === parentId,
    )
    .sort((a, b) => {
      const dateDiff = a.data.date.valueOf() - b.data.date.valueOf()
      if (dateDiff !== 0) return dateDiff

      const orderA = a.data.order ?? 0
      const orderB = b.data.order ?? 0
      return orderA - orderB
    })
}

export function groupNotesByYear(
  notes: CollectionEntry<'notes'>[],
): Record<string, CollectionEntry<'notes'>[]> {
  return notes.reduce(
    (acc: Record<string, CollectionEntry<'notes'>[]>, note) => {
      const year = note.data.date.getFullYear().toString()
      ;(acc[year] ??= []).push(note)
      return acc
    },
    {},
  )
}

export async function hasSubposts(postId: string): Promise<boolean> {
  const subposts = await getSubpostsForParent(postId)
  return subposts.length > 0
}

export function isSubpost(postId: string): boolean {
  return !isSeriesEntry(postId) && postId.includes('/')
}

export async function getParentNote(
  subpostId: string,
): Promise<CollectionEntry<'notes'> | null> {
  if (!isSubpost(subpostId)) {
    return null
  }

  const parentId = getParentId(subpostId)
  const allNotes = await getAllNotes()
  return allNotes.find((note) => note.id === parentId) || null
}

export async function parseAuthors(authorIds: string[] = []) {
  if (!authorIds.length) return []

  const allAuthors = await getAllAuthors()
  const authorMap = new Map(allAuthors.map((author) => [author.id, author]))

  return authorIds.map((id) => {
    const author = authorMap.get(id)
    return {
      id,
      name: author?.data?.name || id,
      avatar: author?.data?.avatar || '/static/logo.png',
      isRegistered: !!author,
    }
  })
}

export async function getNoteById(
  noteId: string,
): Promise<CollectionEntry<'notes'> | null> {
  const allNotes = await getAllNotesAndSubposts()
  return allNotes.find((note) => note.id === noteId) || null
}

export async function getSubpostCount(parentId: string): Promise<number> {
  const subposts = await getSubpostsForParent(parentId)
  return subposts.length
}

export async function getCombinedReadingTime(postId: string): Promise<string> {
  const note = await getNoteById(postId)
  if (!note) return readingTime(0)

  let totalWords = calculateWordCountFromHtml(note.body)

  if (!isSubpost(postId)) {
    const subposts = await getSubpostsForParent(postId)
    for (const subpost of subposts) {
      totalWords += calculateWordCountFromHtml(subpost.body)
    }
  }

  return readingTime(totalWords)
}

export async function getNoteReadingTime(noteId: string): Promise<string> {
  const note = await getNoteById(noteId)
  if (!note) return readingTime(0)

  const wordCount = calculateWordCountFromHtml(note.body)
  return readingTime(wordCount)
}

export type TOCHeading = {
  slug: string
  text: string
  depth: number
  isSubpostTitle?: boolean
}

export type TOCSection = {
  type: 'parent' | 'subpost'
  title: string
  headings: TOCHeading[]
  subpostId?: string
}
