import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { parseCashValue } from '@renderer/lib/itemValueUtils'
import type { ValueHistoryEntry } from '@shared/itemDetail'

type DateRange = '1w' | '1m' | '3m' | '6m' | '1y' | 'all'

const RANGE_OPTIONS: readonly { value: DateRange; label: string }[] = [
  { value: '1w', label: '1 Week' },
  { value: '1m', label: '1 Month' },
  { value: '3m', label: '3 Months' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All Time' }
]

const DAY_MS = 24 * 60 * 60 * 1000
const RANGE_MS: Record<Exclude<DateRange, 'all'>, number> = {
  '1w': 7 * DAY_MS,
  '1m': 30 * DAY_MS,
  '3m': 90 * DAY_MS,
  '6m': 182 * DAY_MS,
  '1y': 365 * DAY_MS
}

interface ChartPoint {
  timestamp: number
  cash: number | null
  duped: number | null
}

function formatAxisValue(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: number }): React.JSX.Element | null {
  if (!active || !payload || payload.length === 0 || label == null) return null
  return (
    <div className="rounded-lg border border-border-card bg-secondary-bg px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-primary-text">
        {new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export function ItemValueChart({ history }: { history: ValueHistoryEntry[] }): React.JSX.Element {
  const [range, setRange] = useState<DateRange>('all')

  const data = useMemo<ChartPoint[]>(() => {
    const now = Date.now()
    const cutoff = range === 'all' ? 0 : now - RANGE_MS[range]
    return history
      .map((entry) => {
        const cash = parseCashValue(entry.cash_value)
        const duped = parseCashValue(entry.duped_value)
        return {
          timestamp: Number(entry.date) * 1000,
          cash: cash === -1 ? null : cash,
          duped: duped === -1 ? null : duped
        }
      })
      .filter((point) => point.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [history, range])

  const hasDupedValues = data.some((point) => point.duped != null)

  if (history.length === 0) {
    return <p className="py-10 text-center text-sm text-quaternary-text">No value history recorded for this item.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRange(option.value)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              range === option.value
                ? 'border-button-info/40 bg-button-info/20 text-primary-text'
                : 'border-border-card bg-tertiary-bg text-secondary-text hover:bg-quaternary-bg'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="h-80 w-full rounded-2xl border border-border-card bg-secondary-bg p-3">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-quaternary-text">
            No data in this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="itemValueChartCash" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-button-info)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-button-info)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="itemValueChartDuped" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-button-danger)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-button-danger)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-card)" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                stroke="var(--color-tertiary-text)"
                fontSize={11}
                tickLine={false}
              />
              <YAxis tickFormatter={formatAxisValue} stroke="var(--color-tertiary-text)" fontSize={11} width={44} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="cash"
                name="Cash Value"
                stroke="var(--color-button-info)"
                strokeWidth={2}
                fill="url(#itemValueChartCash)"
                connectNulls
              />
              {hasDupedValues && (
                <Area
                  type="monotone"
                  dataKey="duped"
                  name="Duped Value"
                  stroke="var(--color-button-danger)"
                  strokeWidth={2}
                  fill="url(#itemValueChartDuped)"
                  connectNulls
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
