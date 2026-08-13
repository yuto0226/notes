import { getCollection, type CollectionEntry } from 'astro:content'

export type NoteSeries = {
  id: string
  parent: CollectionEntry<'notes'>
  entries: CollectionEntry<'notes'>[]
}

export type SeriesEntryResult = {
  series: NoteSeries
  entry: CollectionEntry<'notes'>
  navigation: {
    older: CollectionEntry<'notes'> | null
    newer: CollectionEntry<'notes'> | null
  }
}

export function isSeriesEntry(id: string): boolean {
  return id.startsWith('series/')
}

export function isSeriesParent(id: string): boolean {
  return isSeriesEntry(id) && id.split('/').length === 2
}

export function isSeriesChild(id: string): boolean {
  return isSeriesEntry(id) && id.split('/').length >= 3
}

function getSeriesId(id: string): string {
  return id.split('/').slice(0, 2).join('/')
}

function buildPublicSeries(notes: CollectionEntry<'notes'>[]): NoteSeries[] {
  const grouped = new Map<
    string,
    {
      parent: CollectionEntry<'notes'> | null
      entries: CollectionEntry<'notes'>[]
    }
  >()

  for (const note of notes) {
    if (!isSeriesEntry(note.id)) continue

    const seriesId = getSeriesId(note.id)
    const group = grouped.get(seriesId) ?? { parent: null, entries: [] }

    if (isSeriesParent(note.id)) {
      group.parent = note
    } else if (isSeriesChild(note.id)) {
      group.entries.push(note)
    }

    grouped.set(seriesId, group)
  }

  const series = [...grouped.entries()].flatMap(([id, { parent, entries }]) => {
    if (!parent) {
      throw new Error(`Series "${id}" has entries but no index.md parent`)
    }

    if (parent.data.draft) return []

    return [
      {
        id,
        parent,
        entries: entries
          .filter((entry) => !entry.data.draft)
          .sort((a, b) => {
            const dateDifference = a.data.date.valueOf() - b.data.date.valueOf()
            return dateDifference || a.id.localeCompare(b.id)
          }),
      },
    ]
  })

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
  if (!isSeriesChild(id)) return null

  const notes = await getCollection('notes')
  const series =
    buildPublicSeries(notes).find(
      (candidate) => candidate.id === getSeriesId(id),
    ) ?? null
  if (!series) return null

  const entryIndex = series.entries.findIndex((entry) => entry.id === id)
  if (entryIndex === -1) return null

  return {
    series,
    entry: series.entries[entryIndex],
    navigation: {
      older: entryIndex > 0 ? series.entries[entryIndex - 1] : null,
      newer:
        entryIndex < series.entries.length - 1
          ? series.entries[entryIndex + 1]
          : null,
    },
  }
}
