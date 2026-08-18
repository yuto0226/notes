import { useEffect, useRef, useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ActivityEntry } from '@/lib/data-utils'

export type HeatmapDay = {
  key: string
  entries: ActivityEntry[]
}

// Ordered thresholds paired with their swatch class, so the color scale
// and its legend (rendered separately in ActivityHeatmap.astro) can never
// drift out of sync.
export const LEVELS = [
  { max: 0, class: 'bg-muted' },
  { max: 1, class: 'bg-primary/25' },
  { max: 3, class: 'bg-primary/50' },
  { max: 6, class: 'bg-primary/75' },
  { max: Infinity, class: 'bg-primary' },
]

const levelClassForCount = (count: number) =>
  LEVELS.find((level) => count <= level.max)!.class

const CELL_SIZE = 12 // px, matches h-3 w-3
const CELL_GAP = 3 // px, matches gap-[3px]
const WEEK_PITCH = CELL_SIZE + CELL_GAP

interface Props {
  days: HeatmapDay[]
}

export default function HeatmapGrid({ days }: Props) {
  const maxWeeks = days.length / 7

  // Measured against a plain (non-scrolling) wrapper rather than the
  // overflow-x-auto element itself, so a scrollbar appearing/disappearing
  // as the fitted week count changes can't feed back into the measurement.
  const measureRef = useRef<HTMLDivElement>(null)
  const [visibleWeeks, setVisibleWeeks] = useState(maxWeeks)

  useEffect(() => {
    const el = measureRef.current
    if (!el) return

    const fitToWidth = () => {
      const weeks = Math.floor((el.clientWidth + CELL_GAP) / WEEK_PITCH)
      setVisibleWeeks(Math.min(Math.max(weeks, 1), maxWeeks))
    }

    fitToWidth()
    const observer = new ResizeObserver(fitToWidth)
    observer.observe(el)
    return () => observer.disconnect()
  }, [maxWeeks])

  const visibleDays = days.slice(-visibleWeeks * 7)

  return (
    <div ref={measureRef}>
      <div className="overflow-x-auto pb-1">
        <div
          className="grid w-max grid-flow-col grid-rows-7 gap-[3px]"
          style={{ gridAutoColumns: `${CELL_SIZE}px` }}
        >
          {visibleDays.map((day) => (
            <Tooltip key={day.key}>
              <TooltipTrigger asChild>
                <span
                  tabIndex={0}
                  className={cn(
                    'block h-3 w-3 rounded-[3px] transition-transform outline-none hover:scale-110 focus-visible:scale-110',
                    levelClassForCount(day.entries.length),
                  )}
                />
              </TooltipTrigger>
              <TooltipContent sideOffset={2}>
                <p className="font-mono font-semibold">
                  {day.key.replaceAll('-', '.')}
                </p>
                {day.entries.length === 0 ? (
                  <p className="text-primary-foreground/70 mt-1">沒有發布</p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {day.entries.map((entry) => (
                      <li key={entry.href}>
                        <a
                          href={entry.href}
                          className="block truncate hover:underline"
                        >
                          ・{entry.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </div>
  )
}
