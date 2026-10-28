import { lazy, Suspense, useEffect, useState } from 'react'
import { useValues } from '@renderer/contexts/ValuesContext'
import { useRelativeTime } from '@renderer/hooks/useRelativeTime'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { CreatorLink } from '@renderer/components/values/CreatorLink'
import { ItemValuesPanel } from '@renderer/components/values/ItemValuesPanel'
import { ItemHoardersTab } from '@renderer/components/values/itemdetail/ItemHoardersTab'
import { ItemDupesTab } from '@renderer/components/values/itemdetail/ItemDupesTab'
import { ItemSuggestionsList } from '@renderer/components/values/itemdetail/ItemSuggestionsList'
import { ItemSimilarSheet } from '@renderer/components/values/itemdetail/ItemSimilarSheet'
import { ItemComments } from '@renderer/components/values/itemdetail/ItemComments'
import { itemDetailApi } from '@renderer/lib/itemDetailApi'
import { CategoryIconBadge, getCategoryColor, getCategoryIcon } from '@renderer/lib/categoryIcons'
import { getItemImagePath, handleImageError } from '@renderer/lib/itemValueUtils'
import type { ValueHistoryEntry } from '@shared/itemDetail'
import type { Item } from '@shared/item'

const ItemValueChart = lazy(() =>
  import('@renderer/components/values/itemdetail/ItemValueChart').then((m) => ({ default: m.ItemValueChart }))
)

const INITIAL_DESCRIPTION_LENGTH = 500

const SIMILAR_SHEET_MIN_ROW_WIDTH = 1100

const BADGE = 'inline-flex h-6 shrink-0 items-center rounded-lg border bg-tertiary-bg/40 px-2.5 text-xs font-medium text-primary-text'

function ChartSkeleton(): React.JSX.Element {
  return <div className="h-[420px] animate-pulse rounded-2xl bg-quaternary-bg/70" />
}

function ArrowLeftIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.81 15.9 9 18.75l-.81-2.85a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.85-.81a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.81 2.85a4.5 4.5 0 0 0 3.09 3.09l2.85.81-2.85.81a4.5 4.5 0 0 0-3.09 3.09ZM18.26 8.72 18 9.75l-.26-1.03a3.38 3.38 0 0 0-2.46-2.46L14.25 6l1.03-.26a3.38 3.38 0 0 0 2.46-2.46L18 2.25l.26 1.03a3.38 3.38 0 0 0 2.46 2.46l1.03.26-1.03.26a3.38 3.38 0 0 0-2.46 2.46Z"
      />
    </svg>
  )
}

function ClockIcon({ className, style }: { className?: string; style?: React.CSSProperties }): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3.5 2" />
    </svg>
  )
}

function SnowflakeIcon({ className, style }: { className?: string; style?: React.CSSProperties }): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M12 2v20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1M2 12h20" />
    </svg>
  )
}

function formatCustomDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function Overview({ item }: { item: Item }): React.JSX.Element {
  const relativeUpdated = useRelativeTime(item.last_updated)
  const [visibleLength, setVisibleLength] = useState(INITIAL_DESCRIPTION_LENGTH)
  const categoryColor = getCategoryColor(item.type)
  const CategoryIcon = getCategoryIcon(item.type)
  const hasDescription = item.description && item.description !== 'N/A' && item.description !== ''
  const hasNotes = item.notes && item.notes !== 'N/A' && item.notes.trim() !== ''
  const metadata = item.id !== 587 ? item.metadata : null
  const metrics = metadata
    ? [
        { label: 'Times Traded', value: metadata.TimesTraded },
        { label: 'Unique Circulation', value: metadata.UniqueCirculation },
        { label: 'Demand Multiple', value: metadata.DemandMultiple }
      ].filter((m): m is { label: string; value: number } => typeof m.value === 'number')
    : []

  return (
    <div className="flex flex-col gap-5">
      <div className="grid min-w-0 grid-cols-[minmax(0,13rem)_minmax(0,1fr)] gap-x-5 gap-y-4 @3xl:grid-cols-[minmax(240px,2fr)_3fr]">
        <div
          className="relative min-w-0 self-start overflow-hidden rounded-2xl bg-tertiary-bg @3xl:row-span-2"
          style={{ aspectRatio: '854 / 480' }}
        >
          <div className="absolute top-3 right-3 z-10">
            <CategoryIconBadge type={item.type} isLimited={item.is_limited === 1} isSeasonal={item.is_seasonal === 1} />
          </div>
          <img
            src={getItemImagePath(item.type, item.name)}
            alt={item.name}
            onError={handleImageError}
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>

        <div className="min-w-0 self-center @3xl:self-start">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 truncate text-2xl font-bold text-primary-text">{item.name}</h1>
              <span className={BADGE} style={{ borderColor: categoryColor }}>
                {CategoryIcon && <CategoryIcon className="mr-1.5 h-3 w-3" style={{ color: categoryColor }} />}
                {item.type}
              </span>
              {item.is_limited === 1 && (
                <span className={`${BADGE} border-border-card`}>
                  <ClockIcon className="mr-1.5 h-3 w-3" style={{ color: '#ffd700' }} />
                  Limited
                </span>
              )}
              {item.is_seasonal === 1 && (
                <span className={`${BADGE} border-border-card`}>
                  <SnowflakeIcon className="mr-1.5 h-3 w-3" style={{ color: '#40c0e7' }} />
                  Seasonal
                </span>
              )}
              {item.tradable === 0 && (
                <span className={`${BADGE} border-border-card`}>{item.id === 713 ? 'Reference Only' : 'Non-Tradable'}</span>
              )}
            </div>
            <p className="mt-1 text-sm text-secondary-text">
              Created by <CreatorLink creator={item.creator} /> ·{' '}
              {item.last_updated ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">Updated {relativeUpdated}</span>
                  </TooltipTrigger>
                  <TooltipContent>{formatCustomDate(item.last_updated)}</TooltipContent>
                </Tooltip>
              ) : (
                'Never updated'
              )}
            </p>
        </div>

        <div className="col-span-2 min-w-0 @3xl:col-span-1">
          <ItemValuesPanel item={item} />
        </div>
      </div>

      {hasNotes && (
        <div className="rounded-xl border border-button-info/30 bg-button-info/10 px-4 py-3">
          <h4 className="text-[11px] font-semibold tracking-wide text-secondary-text uppercase">Item Notes</h4>
          <p className="mt-1 text-sm font-medium text-primary-text">{item.notes}</p>
        </div>
      )}

      {metrics.length > 0 && (
        <div className="rounded-xl border border-border-card bg-secondary-bg p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h3 className="text-[11px] font-semibold tracking-wide text-primary-text uppercase">Official Trading Metrics</h3>
            <span className="text-xs text-secondary-text">
              by Badimo{metadata?.LastUpdated ? ` · updated ${formatCustomDate(metadata.LastUpdated)}` : ''}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border border-border-card bg-tertiary-bg px-3 py-2.5">
                <div className="text-xs text-secondary-text">{metric.label}</div>
                <div className="text-lg font-semibold text-primary-text tabular-nums">{metric.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-lg font-semibold text-primary-text">Description</h3>
        <div className="text-sm leading-relaxed text-secondary-text">
          {hasDescription ? (
            <p className="whitespace-pre-wrap">
              {item.description.length > visibleLength ? (
                <>
                  {item.description.slice(0, visibleLength)}...{' '}
                  <button
                    type="button"
                    onClick={() => setVisibleLength((prev) => prev + INITIAL_DESCRIPTION_LENGTH)}
                    className="font-medium text-button-info hover:text-button-info-hover hover:underline"
                  >
                    Read More
                  </button>
                </>
              ) : (
                item.description
              )}
            </p>
          ) : (
            <p>No description available</p>
          )}
        </div>
      </div>
    </div>
  )
}

function Charts({ item }: { item: Item }): React.JSX.Element {
  const [history, setHistory] = useState<ValueHistoryEntry[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    itemDetailApi
      .valueHistory(item.id)
      .then((result) => !cancelled && setHistory(Array.isArray(result) ? result : []))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [item.id])

  if (error) return <p className="py-8 text-center text-sm text-status-error">Failed to load value history.</p>
  if (!history) return <ChartSkeleton />
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <ItemValueChart history={history} showMetrics={item.id !== 587} />
    </Suspense>
  )
}

export function ItemDetailScreen({ item }: { item: Item }): React.JSX.Element {
  const { selectItem, itemSection } = useValues()
  const [row, setRow] = useState<HTMLDivElement | null>(null)
  const [rowWidth, setRowWidth] = useState(0)
  const [similarPinned, setSimilarPinned] = useState(true)
  const [similarOverlayOpen, setSimilarOverlayOpen] = useState(false)

  useEffect(() => {
    if (!row) return undefined
    const observer = new ResizeObserver(([entry]) => setRowWidth(entry.contentRect.width))
    observer.observe(row)
    return () => observer.disconnect()
  }, [row])

  const narrow = rowWidth > 0 && rowWidth < SIMILAR_SHEET_MIN_ROW_WIDTH
  const showSimilar = narrow ? similarOverlayOpen : similarPinned
  const toggleSimilar = (): void => (narrow ? setSimilarOverlayOpen((open) => !open) : setSimilarPinned((pinned) => !pinned))
  useEffect(() => setSimilarOverlayOpen(false), [item.id, narrow])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-[57px] min-w-0 shrink-0 items-center gap-3 border-b border-border-primary px-3 sm:px-5">
        <button
          type="button"
          onClick={() => selectItem(null)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
          aria-label="Back to values"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-primary-text">{item.name}</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleSimilar}
              aria-label={showSimilar ? 'Hide similar items' : 'Show similar items'}
              aria-pressed={showSimilar}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-quaternary-bg hover:text-primary-text ${showSimilar ? 'text-primary-text' : 'text-secondary-text'}`}
            >
              <SparklesIcon className="h-4.5 w-4.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{showSimilar ? 'Hide similar items' : 'Show similar items'}</TooltipContent>
        </Tooltip>
      </div>

      <div ref={setRow} className="relative flex min-h-0 min-w-0 flex-1">
        <div className={`min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-5 ${narrow ? '' : 'mr-64'}`}>
          <div className="@container mx-auto flex min-h-full w-full max-w-5xl min-w-0 flex-col gap-6">
            <div
              key={`${itemSection}-${item.id}`}
              className="flex-1 animate-in fade-in-0 slide-in-from-bottom-2 duration-200 motion-reduce:animate-none"
            >
            {itemSection === 'overview' && <Overview key={`overview-${item.id}`} item={item} />}
            {itemSection === 'charts' && <Charts key={`charts-${item.id}`} item={item} />}
            {itemSection === 'changes' && <ItemSuggestionsList key={`changes-${item.id}`} itemId={item.id} kind="change" />}
            {itemSection === 'suggestions' && (
              <ItemSuggestionsList key={`suggestions-${item.id}`} itemId={item.id} kind="suggestion" />
            )}
            {itemSection === 'dupes' && <ItemDupesTab key={`dupes-${item.id}`} itemId={item.id} />}
            {itemSection === 'hoarders' && <ItemHoardersTab key={`hoarders-${item.id}`} itemName={item.name} itemType={item.type} />}
            </div>
            <ItemComments key={`comments-${item.id}`} item={item} />
          </div>
        </div>

        {showSimilar && (
          <div
            className={`absolute inset-y-0 right-0 z-20 flex animate-in slide-in-from-right-4 fade-in-0 duration-150 ${narrow ? 'shadow-2xl' : ''}`}
          >
            <ItemSimilarSheet item={item} />
          </div>
        )}
      </div>
    </div>
  )
}
