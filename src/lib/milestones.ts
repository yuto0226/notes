type DatePrecision = 'day' | 'month'

interface MilestoneDate {
  value: Date
  precision: DatePrecision
}

interface MilestonePresenterData {
  startDate: string
  endDate?: string
  isOngoing?: boolean
  organization?: string
  role?: string
}

export function parseMilestoneDate(date: string): MilestoneDate {
  const [year, month, day] = date.split('/').map(Number)

  return {
    value: new Date(Date.UTC(year, month - 1, day || 1)),
    precision: day === 0 ? 'month' : 'day',
  }
}

function formatMilestoneDate(date: MilestoneDate) {
  const year = date.value.getUTCFullYear()
  const month = String(date.value.getUTCMonth() + 1).padStart(2, '0')

  if (date.precision === 'month') {
    return `${year}/${month}`
  }

  const day = String(date.value.getUTCDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

export function formatMilestoneDatetime(rawDate: string) {
  const date = parseMilestoneDate(rawDate)
  const year = date.value.getUTCFullYear()
  const month = String(date.value.getUTCMonth() + 1).padStart(2, '0')

  if (date.precision === 'month') {
    return `${year}-${month}`
  }

  const day = String(date.value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatMilestoneDateRange(milestone: MilestonePresenterData) {
  const start = formatMilestoneDate(parseMilestoneDate(milestone.startDate))
  if (milestone.isOngoing) return `${start} - Present`
  if (milestone.endDate) {
    return `${start} - ${formatMilestoneDate(parseMilestoneDate(milestone.endDate))}`
  }
  return start
}

export function getMilestoneMeta(milestone: MilestonePresenterData) {
  return [milestone.organization, milestone.role].filter(Boolean).join(' · ')
}
