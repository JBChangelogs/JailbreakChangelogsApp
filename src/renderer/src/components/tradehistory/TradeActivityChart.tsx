import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTradeHistory } from '@renderer/contexts/TradeHistoryContext'

const DAY_MS = 24 * 60 * 60 * 1000
const LEVEL_CLASSES = [
  'bg-quaternary-bg',
  'bg-button-info/25',
  'bg-button-info/50',
  'bg-button-info/75',
  'bg-button-info'
]
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

interface Cell {
  day: string
  count: number
  level: number
  future: boolean
}

export const dayKey = (time: number): string => new Date(time).toISOString().slice(0, 10)

export const formatDay = (day: string, withWeekday = false): string =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: withWeekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  })

function levelThresholds(counts: number[]): number[] {
  const busy = counts.filter((count) => count > 0).sort((a, b) => a - b)
  if (busy.length === 0) return [0, 0, 0]
  const at = (q: number): number => busy[Math.min(busy.length - 1, Math.floor(q * (busy.length - 1)))]
  return [at(0.25), at(0.5), at(0.75)]
}

function buildWeeks(days: Record<string, number>): { weeks: Cell[][]; months: { column: number; label: string }[] } {
  const today = Date.parse(`${dayKey(Date.now())}T00:00:00Z`)
  const first = today - 364 * DAY_MS
  const start = first - new Date(first).getUTCDay() * DAY_MS
  const [q1, q2, q3] = levelThresholds(Object.values(days))
  const weeks: Cell[][] = []
  const months: { column: number; label: string }[] = []
  for (let time = start; time <= today + (6 - new Date(today).getUTCDay()) * DAY_MS; time += DAY_MS) {
    const date = new Date(time)
    if (date.getUTCDay() === 0) weeks.push([])
    const day = dayKey(time)
    const count = days[day] ?? 0
    const level = count <= 0 ? 0 : count <= q1 ? 1 : count <= q2 ? 2 : count <= q3 ? 3 : 4
    weeks[weeks.length - 1].push({ day, count, level, future: time > today })
    if (date.getUTCDate() === 1 && time >= first) {
      months.push({
        column: weeks.length - 1,
        label: date.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })
      })
    }
  }
  return { weeks, months }
}

export function TradeActivityChart(): React.JSX.Element | null {
  const { activity, selectedDay, selectDay } = useTradeHistory()
  const chartRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<{ cell: Cell; left: number; top: number } | null>(null)
  const days = activity?.status === 'ready' ? activity.activity.days : null
  const { weeks, months } = useMemo(() => buildWeeks(days ?? {}), [days])

  useLayoutEffect(() => {
    const scroller = scrollRef.current
    if (scroller) scroller.scrollLeft = scroller.scrollWidth
  }, [weeks])

  if (!activity) return null

  const showTooltip = (cell: Cell, target: HTMLElement): void => {
    const chart = chartRef.current
    if (!chart) return
    const box = chart.getBoundingClientRect()
    const rect = target.getBoundingClientRect()
    const left = Math.min(Math.max(rect.left - box.left + rect.width / 2, 90), box.width - 90)
    setHovered({ cell, left, top: rect.top - box.top })
  }

  return (
    <section className="mb-4 rounded-xl border border-border-card bg-tertiary-bg p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-primary-text">
          {activity.status === 'ready'
            ? `${activity.activity.total.toLocaleString()} ${activity.activity.total === 1 ? 'trade' : 'trades'} in the last year`
            : 'Trade activity'}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-tertiary-text">
          Less
          {LEVEL_CLASSES.map((className) => (
            <span key={className} className={`h-2.5 w-2.5 rounded-[3px] ${className}`} />
          ))}
          More
        </div>
      </div>

      {activity.status === 'error' ? (
        <p className="py-6 text-center text-xs text-secondary-text">Couldn't load trade activity.</p>
      ) : (
        <div ref={chartRef} className="relative" onMouseLeave={() => setHovered(null)}>
          <div ref={scrollRef} className="overflow-x-auto pb-1" onScroll={() => setHovered(null)}>
            <div
              className="grid gap-[3px]"
              style={{ gridTemplateColumns: `1.75rem repeat(${weeks.length}, minmax(10px, 1fr))` }}
            >
              <span className="sticky left-0 z-[1] bg-tertiary-bg" />
              {weeks.map((_, column) => {
                const month = months.find((entry) => entry.column === column)
                return (
                  <span key={column} className="relative h-4 text-[10px] text-tertiary-text">
                    {month && <span className="absolute left-0 whitespace-nowrap">{month.label}</span>}
                  </span>
                )
              })}
              {WEEKDAY_LABELS.map((label, row) => (
                <div key={row} className="contents">
                  <span className="sticky left-0 z-[1] self-stretch bg-tertiary-bg pr-1 text-[10px] leading-[10px] text-tertiary-text flex items-center">{label}</span>
                  {weeks.map((week) => {
                    const cell = week[row]
                    if (!cell || cell.future) return <span key={`${row}-${cell?.day}`} className="aspect-square" />
                    const selected = cell.day === selectedDay
                    return (
                      <button
                        key={cell.day}
                        type="button"
                        aria-label={`${cell.count} ${cell.count === 1 ? 'trade' : 'trades'} on ${formatDay(cell.day)}`}
                        aria-pressed={selected}
                        disabled={activity.status !== 'ready'}
                        onMouseEnter={(e) => showTooltip(cell, e.currentTarget)}
                        onFocus={(e) => showTooltip(cell, e.currentTarget)}
                        onBlur={() => setHovered(null)}
                        onClick={() => selectDay(selected ? null : cell.day)}
                        className={`aspect-square rounded-[3px] transition-[box-shadow] ${
                          activity.status === 'ready' ? LEVEL_CLASSES[cell.level] : 'animate-pulse bg-quaternary-bg'
                        } ${selected ? 'ring-2 ring-primary-text ring-offset-1 ring-offset-tertiary-bg' : 'hover:ring-1 hover:ring-secondary-text'}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {hovered && activity.status === 'ready' && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border-card bg-primary-bg px-2 py-1 text-xs whitespace-nowrap text-primary-text shadow-lg"
              style={{ left: hovered.left, top: hovered.top - 6 }}
            >
              <span className="font-semibold">
                {hovered.cell.count === 0 ? 'No' : hovered.cell.count.toLocaleString()}{' '}
                {hovered.cell.count === 1 ? 'trade' : 'trades'}
              </span>
              <span className="text-secondary-text"> on {formatDay(hovered.cell.day, true)}</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
