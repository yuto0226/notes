import { getCollection, type CollectionEntry } from 'astro:content'

type NoteEntry = CollectionEntry<'notes'>

export type NoteSeries = {
  id: string
  parent: NoteEntry
  entries: NoteEntry[]
  subposts: NoteEntry[]
}

type SeriesEntryBase = {
  series: NoteSeries
  entry: NoteEntry
  navigation: {
    older: NoteEntry | null
    newer: NoteEntry | null
  }
}

export type SeriesEntryResult =
  | (SeriesEntryBase & {
      kind: 'post'
      parentEntry: null
    })
  | (SeriesEntryBase & {
      kind: 'subpost'
      parentEntry: NoteEntry
    })

function getSegments(id: string): string[] {
  return id.split('/')
}

export function isSeriesContent(id: string): boolean {
  return id.startsWith('series/')
}

export function isSeriesParent(id: string): boolean {
  return isSeriesContent(id) && getSegments(id).length === 2
}

function isSeriesParentEntry(entry: NoteEntry): boolean {
  return (
    isSeriesParent(entry.id) &&
    /\/index\.mdx?$/.test(entry.filePath?.replaceAll('\\', '/') ?? '')
  )
}

export function isSeriesEntry(id: string): boolean {
  return isSeriesContent(id) && getSegments(id).length === 3
}

export function isSeriesSubpost(id: string): boolean {
  return isSeriesContent(id) && getSegments(id).length >= 4
}

function getSeriesId(id: string): string {
  return getSegments(id).slice(0, 2).join('/')
}

export function getSeriesPostId(id: string): string {
  return getSegments(id).slice(0, 3).join('/')
}

function sortSeriesEntries(entries: NoteEntry[]): NoteEntry[] {
  return entries.sort((a, b) => {
    const dateDifference = a.data.date.valueOf() - b.data.date.valueOf()
    return dateDifference || a.id.localeCompare(b.id)
  })
}

function sortSeriesSubposts(entries: NoteEntry[]): NoteEntry[] {
  return entries.sort((a, b) => {
    const dateDifference = a.data.date.valueOf() - b.data.date.valueOf()
    if (dateDifference !== 0) return dateDifference

    const orderDifference = (a.data.order ?? 0) - (b.data.order ?? 0)
    return orderDifference || a.id.localeCompare(b.id)
  })
}

function buildPublicSeries(notes: NoteEntry[]): NoteSeries[] {
  const grouped = new Map<
    string,
    {
      parent: NoteEntry | null
      entries: NoteEntry[]
      subposts: NoteEntry[]
    }
  >()

  for (const note of notes) {
    if (!isSeriesContent(note.id)) continue

    const seriesId = getSeriesId(note.id)
    const group = grouped.get(seriesId) ?? {
      parent: null,
      entries: [],
      subposts: [],
    }

    if (isSeriesParentEntry(note)) {
      group.parent = note
    } else if (isSeriesEntry(note.id)) {
      group.entries.push(note)
    } else if (isSeriesSubpost(note.id)) {
      group.subposts.push(note)
    }

    grouped.set(seriesId, group)
  }

  const series = [...grouped.entries()].flatMap(
    ([id, { parent, entries, subposts }]) => {
      if (!parent) {
        throw new Error(`Series "${id}" has entries but no index.md parent`)
      }

      if (parent.data.draft) return []

      const publicEntries = sortSeriesEntries(
        entries.filter((entry) => !entry.data.draft),
      )
      const publicEntryIds = new Set(publicEntries.map((entry) => entry.id))

      return [
        {
          id,
          parent,
          entries: publicEntries,
          subposts: sortSeriesSubposts(
            subposts.filter(
              (subpost) =>
                !subpost.data.draft &&
                publicEntryIds.has(getSeriesPostId(subpost.id)),
            ),
          ),
        },
      ]
    },
  )

  return series.sort((a, b) => {
    const dateDifference =
      b.parent.data.date.valueOf() - a.parent.data.date.valueOf()
    return dateDifference || a.id.localeCompare(b.id)
  })
}

export async function getAllSeries(): Promise<NoteSeries[]> {
  const notes = await getCollection('notes')
  return buildPublicSeries(notes)
}

export async function getSeriesById(
  seriesId: string,
): Promise<NoteSeries | null> {
  const notes = await getCollection('notes')
  return (
    buildPublicSeries(notes).find((series) => series.id === seriesId) ?? null
  )
}

export async function getSeriesEntry(
  id: string,
): Promise<SeriesEntryResult | null> {
  if (!isSeriesEntry(id) && !isSeriesSubpost(id)) return null

  const notes = await getCollection('notes')
  const series =
    buildPublicSeries(notes).find(
      (candidate) => candidate.id === getSeriesId(id),
    ) ?? null
  if (!series) return null

  if (isSeriesEntry(id)) {
    const entryIndex = series.entries.findIndex((entry) => entry.id === id)
    if (entryIndex === -1) return null

    return {
      kind: 'post',
      series,
      entry: series.entries[entryIndex],
      parentEntry: null,
      navigation: {
        older: entryIndex > 0 ? series.entries[entryIndex - 1] : null,
        newer:
          entryIndex < series.entries.length - 1
            ? series.entries[entryIndex + 1]
            : null,
      },
    }
  }

  const entry = series.subposts.find((subpost) => subpost.id === id)
  if (!entry) return null

  const parentEntry = series.entries.find(
    (post) => post.id === getSeriesPostId(id),
  )
  if (!parentEntry) return null

  const siblings = series.subposts.filter(
    (subpost) => getSeriesPostId(subpost.id) === parentEntry.id,
  )
  const entryIndex = siblings.findIndex((subpost) => subpost.id === id)

  return {
    kind: 'subpost',
    series,
    entry,
    parentEntry,
    navigation: {
      older: entryIndex > 0 ? siblings[entryIndex - 1] : null,
      newer: entryIndex < siblings.length - 1 ? siblings[entryIndex + 1] : null,
    },
  }
}
