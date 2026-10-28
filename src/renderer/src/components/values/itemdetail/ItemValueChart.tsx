import { useId, useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Tabs } from '@renderer/components/ui/tabs'
import { cn } from '@renderer/lib/utils'
import type { ValueHistoryEntry } from '@shared/itemDetail'

type DateRange = '1w' | '1m' | '3m' | '6m' | '1y' | 'all'
type ChartMode = 'area' | 'bar'
type ChartKind = 'value' | 'metrics'
type Point = { timestamp: number } & Record<string, number | null>
type Series = { key: string; label: string; short: string; color: string }

const RANGES: readonly { value: DateRange; label: string }[] = [
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' }
]

const MODES: readonly { value: ChartMode; label: string }[] = [
  { value: 'area', label: 'Line' },
  { value: 'bar', label: 'Bar' }
]

const VALUE_SERIES: Series[] = [
  { key: 'cash', label: 'Cash Value', short: 'Cash', color: '#2462cd' },
  { key: 'duped', label: 'Duped Value', short: 'Duped', color: '#ed4f4f' }
]

const METRIC_SERIES: Series[] = [
  { key: 'traded', label: 'Times Traded', short: 'Times Traded', color: '#10b981' },
  { key: 'circulation', label: 'Unique Circulation', short: 'Unique Circulation', color: '#f59e0b' },
  { key: 'scanned', label: 'Times Scanned', short: 'Times Scanned', color: '#8b5cf6' }
]

const MAX_BARS = 36
const CHART_HEIGHT = 300

function rangeCutoff(range: DateRange): number {
  if (range === 'all') return 0
  const date = new Date()
  if (range === '1w') date.setDate(date.getDate() - 7)
  if (range === '1m') date.setMonth(date.getMonth() - 1)
  if (range === '3m') date.setMonth(date.getMonth() - 3)
  if (range === '6m') date.setMonth(date.getMonth() - 6)
  if (range === '1y') date.setFullYear(date.getFullYear() - 1)
  return date.getTime()
}

function parseRawValue(value: string): number | null {
  if (!value || value === 'N/A') return null
  const v = value.toString().trim().toLowerCase()
  const suffix = v.slice(-1)
  const n = parseFloat(v.replace(/[km]$/, ''))
  if (isNaN(n)) return null
  return suffix === 'k' ? n * 1000 : suffix === 'm' ? n * 1_000_000 : n
}

function avgNullable(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null)
  return present.length ? present.reduce((a, b) => a + b, 0) / present.length : null
}

function aggregate(data: Point[], series: Series[]): Point[] {
  if (data.length <= MAX_BARS) return data
  const size = Math.ceil(data.length / MAX_BARS)
  const out: Point[] = []
  for (let i = 0; i < data.length; i += size) {
    const chunk = data.slice(i, i + size)
    const point: Point = { timestamp: chunk[chunk.length - 1].timestamp }
    for (const { key } of series) point[key] = avgNullable(chunk.map((p) => p[key]))
    out.push(point)
  }
  return out
}

function getNiceStep(range: number, targetTicks = 6): number {
  if (range <= 0) return 1
  const rough = range / (targetTicks - 1)
  const mag = 10 ** Math.floor(Math.log10(rough))
  const f = rough / mag
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nice * mag
}

function getYAxisDomain(points: Point[], series: Series[]): [number, number] {
  const values = points.flatMap((p) => series.map((s) => p[s.key])).filter((v): v is number => v != null && isFinite(v))
  if (values.length === 0) return [0, 1]
  const baseMin = Math.max(0, Math.min(...values))
  const baseMax = Math.max(baseMin, Math.max(...values))
  const baseRange = Math.max(baseMax - baseMin, baseMax * 0.01, 1)
  const pad = baseRange * 0.08
  const pMin = Math.max(0, baseMin - pad)
  const pMax = baseMax + pad
  const step = getNiceStep(pMax - pMin)
  let axisMin = Math.floor(pMin / step) * step
  const axisMax = Math.ceil(pMax / step) * step
  if (axisMin === 0 && pMin > 0) axisMin = Math.floor(pMin)
  if (axisMax <= axisMin) return [Math.max(0, axisMin - step), axisMin + step]
  return [axisMin, axisMax]
}

function trimZeros(text: string): string {
  return text.replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1')
}

function valueAxis(domain: [number, number]): { ticks?: number[]; format: (v: number) => string } {
  const [axisMin, axisMax] = domain
  let step = getNiceStep(axisMax - axisMin)
  if (axisMax >= 1_000_000 && step < 1000) step = 1000
  let ticks: number[] | undefined
  if (axisMax - axisMin <= 50_000) {
    ticks = []
    for (let v = axisMin; v <= axisMax + step / 10; v += step) ticks.push(Math.round(v))
    if (ticks.length > 7) ticks = undefined
  }
  const format = (v: number): string => {
    if (Math.abs(v) < 1000) return String(Math.round(v))
    if (v % 1_000_000 === 0) return `${v / 1_000_000}m`
    if (v >= 1_000_000) {
      const stepM = step / 1_000_000
      const d = stepM < 1 ? Math.min(3, Math.ceil(-Math.log10(stepM))) : 0
      return `${trimZeros((v / 1_000_000).toFixed(d))}m`
    }
    const stepK = step / 1000
    const d = stepK < 1 ? Math.min(2, Math.ceil(-Math.log10(stepK))) : 0
    return `${trimZeros((v / 1000).toFixed(d))}k`
  }
  return { ticks, format }
}

function trendOf(data: Point[], key: string): { last: number; direction: 'up' | 'down' | 'flat'; percent: string } | null {
  const values = data.map((p) => p[key]).filter((v): v is number => v != null)
  if (values.length === 0) return null
  const first = values[0]
  const last = values[values.length - 1]
  const pct = values.length > 1 && first > 0 ? Math.abs(((last - first) / first) * 100) : 0
  const direction = pct < 1 ? 'flat' : last > first ? 'up' : 'down'
  return { last, direction, percent: pct.toFixed(1) }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function nextUpdateTime(): string {
  const update = new Date()
  update.setUTCHours(23, 0, 0, 0)
  return update.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' })
}

function ChartTooltip({
  active,
  payload,
  label
}: {
  active?: boolean
  payload?: { value: number | null; name: string; color: string; fill?: string; stroke?: string }[]
  label?: number
}): React.JSX.Element | null {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-48 rounded-lg border border-border-card bg-secondary-bg/55 px-3 py-2 text-xs shadow-xl backdrop-blur-3xl">
      <p className="mb-1.5 font-medium text-primary-text">{label != null && isFinite(label) ? formatDate(label) : 'Unknown Date'}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-secondary-text">
            <span className="h-2.5 w-2.5 rounded-xs" style={{ background: entry.stroke ?? entry.fill ?? entry.color }} />
            {entry.name}
          </span>
          <span className="font-mono font-semibold text-primary-text tabular-nums">
            {entry.value == null ? 'N/A' : Number(entry.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function TrendIcon({ direction, className }: { direction: 'up' | 'down' | 'flat'; className?: string }): React.JSX.Element {
  const d =
    direction === 'up'
      ? 'M2.25 18 9 11.25l4.3 4.3a11.95 11.95 0 0 1 5.81-5.52l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.94'
      : direction === 'down'
        ? 'M2.25 6 9 12.75l4.29-4.29a11.95 11.95 0 0 1 5.81 5.52l2.65 1.21m0 0-5.94 2.28m5.94-2.28-2.28-5.94'
        : 'M5 12h14'
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

function EmptyChart(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <p className="font-semibold text-primary-text">No Data Available</p>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-secondary-text">
        This item doesn't have any recorded data yet. Charts will appear here once data becomes available.
      </p>
    </div>
  )
}

export function ItemValueChart({ history, showMetrics }: { history: ValueHistoryEntry[]; showMetrics: boolean }): React.JSX.Element {
  const gradientId = useId().replace(/:/g, '')
  const [kind, setKind] = useState<ChartKind>('value')
  const [mode, setMode] = useState<ChartMode>('area')
  const [range, setRange] = useState<DateRange>('all')
  const series = kind === 'value' ? VALUE_SERIES : METRIC_SERIES

  const allPoints = useMemo<Point[]>(() => {
    const sorted = [...history].sort((a, b) => parseInt(a.date) - parseInt(b.date))
    if (kind === 'value') {
      return sorted.map((entry) => ({
        timestamp: parseInt(entry.date) * 1000,
        cash: parseRawValue(entry.cash_value),
        duped: parseRawValue(entry.duped_value)
      }))
    }
    return sorted
      .filter((entry) => entry.metadata)
      .map((entry) => ({
        timestamp: parseInt(entry.date) * 1000,
        traded: entry.metadata?.TimesTraded ?? 0,
        circulation: entry.metadata?.UniqueCirculation ?? 0,
        scanned: entry.metadata?.TimesScanned ?? null
      }))
  }, [history, kind])

  const oldest = allPoints[0]?.timestamp ?? Infinity
  const activeRange = range !== 'all' && oldest > rangeCutoff(range) ? 'all' : range
  const filtered = useMemo(() => {
    const cutoff = rangeCutoff(activeRange)
    return allPoints.filter((p) => p.timestamp >= cutoff)
  }, [allPoints, activeRange])
  const displayed = useMemo(() => (mode === 'bar' ? aggregate(filtered, series) : filtered), [filtered, mode, series])
  const visibleSeries = series.filter((s) => filtered.some((p) => p[s.key] != null))

  const domain = kind === 'value' ? getYAxisDomain(displayed, series) : undefined
  const axis = domain ? valueAxis(domain) : { ticks: undefined, format: (v: number) => Number(v).toLocaleString() }
  const yAxis = (
    <YAxis
      tickLine={false}
      axisLine={false}
      tickMargin={8}
      width={kind === 'value' ? 56 : 72}
      tick={{ fill: 'var(--color-secondary-text)', fontSize: 12 }}
      domain={domain}
      ticks={axis.ticks}
      tickFormatter={axis.format}
    />
  )
  const grid = <CartesianGrid vertical={false} stroke="var(--color-border-card)" strokeOpacity={0.5} />
  const legend = <Legend verticalAlign="bottom" wrapperStyle={{ color: 'var(--color-secondary-text)', fontSize: 12 }} />
  const xTick = { fill: 'var(--color-tertiary-text)', fontSize: 11 }
  const shortDate = (t: number): string => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="space-y-3 rounded-2xl border border-border-card bg-secondary-bg p-4">
      {showMetrics && (
        <Tabs
          value={kind}
          onChange={setKind}
          options={[
            { value: 'value', label: 'Value History' },
            { value: 'metrics', label: 'Trading Metrics' }
          ]}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={mode} onChange={setMode} options={MODES} fill={false} />
        <div className="flex rounded-xl border border-border-card bg-tertiary-bg p-1">
          {RANGES.map((option) => {
            const disabled = option.value !== 'all' && oldest > rangeCutoff(option.value)
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => setRange(option.value)}
                className={cn(
                  'h-7 rounded-lg px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35',
                  activeRange === option.value
                    ? 'bg-button-info text-form-button-text'
                    : 'text-secondary-text enabled:hover:text-primary-text'
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {visibleSeries.length === 0 ? (
        <EmptyChart />
      ) : (
        <>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {visibleSeries.map((s) => {
              const trend = trendOf(filtered, s.key)
              if (!trend) return null
              const color =
                trend.direction === 'up'
                  ? 'var(--color-form-success)'
                  : trend.direction === 'down'
                    ? 'var(--color-button-danger)'
                    : 'var(--color-secondary-text)'
              return (
                <div key={s.key} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-xs" style={{ background: s.color }} />
                  <span className="text-secondary-text">{s.short}</span>
                  <span className="font-semibold text-primary-text tabular-nums">{trend.last.toLocaleString()}</span>
                  <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color }}>
                    <TrendIcon direction={trend.direction} className="h-3.5 w-3.5" />
                    {trend.direction === 'flat' ? 'No trend' : `${trend.percent}%`}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ height: CHART_HEIGHT }}>
            <ResponsiveContainer width="100%" height="100%">
              {mode === 'area' ? (
                <AreaChart data={displayed} margin={{ left: 6, right: 6 }} accessibilityLayer>
                  <defs>
                    {visibleSeries.map((s) => (
                      <linearGradient key={s.key} id={`${gradientId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={s.color} stopOpacity={kind === 'value' ? 0.45 : 0.35} />
                        <stop offset="95%" stopColor={s.color} stopOpacity={kind === 'value' ? 0.04 : 0.05} />
                      </linearGradient>
                    ))}
                  </defs>
                  {grid}
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tickLine={false}
                    axisLine={false}
                    tick={xTick}
                    tickFormatter={shortDate}
                    minTickGap={64}
                  />
                  {yAxis}
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ stroke: 'var(--color-tertiary-text)', strokeDasharray: '4 4', strokeWidth: 1 }}
                  />
                  {legend}
                  {visibleSeries.map((s) => (
                    <Area
                      key={s.key}
                      dataKey={s.key}
                      name={s.label}
                      type="natural"
                      stroke={s.color}
                      strokeWidth={3}
                      dot={false}
                      connectNulls={false}
                      fill={`url(#${gradientId}-${s.key})`}
                      fillOpacity={1}
                      activeDot={{ r: 5, fill: 'var(--color-secondary-bg)', stroke: s.color, strokeWidth: 2 }}
                    />
                  ))}
                </AreaChart>
              ) : (
                <BarChart data={displayed} margin={{ left: 6, right: 6 }} accessibilityLayer>
                  {grid}
                  <XAxis
                    dataKey="timestamp"
                    tickLine={false}
                    axisLine={false}
                    tick={xTick}
                    tickFormatter={shortDate}
                    minTickGap={64}
                  />
                  {yAxis}
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#6b7280', fillOpacity: 0.28 }} />
                  {legend}
                  {visibleSeries.map((s) => (
                    <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} fillOpacity={0.7} radius={[6, 6, 0, 0]} />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-secondary-text">
            <span>
              {formatDate(filtered[0].timestamp)} - {formatDate(filtered[filtered.length - 1].timestamp)}
            </span>
            <span>Charts update daily at {nextUpdateTime()}</span>
          </div>
        </>
      )}
    </div>
  )
}
