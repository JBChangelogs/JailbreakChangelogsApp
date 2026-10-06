import { useEffect, useState } from 'react'
import { useValues } from '@renderer/contexts/ValuesContext'
import { useRelativeTime } from '@renderer/hooks/useRelativeTime'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { CreatorLink } from '@renderer/components/values/CreatorLink'
import { ItemValuesPanel } from '@renderer/components/values/ItemValuesPanel'
import { ItemValueChart } from '@renderer/components/values/itemdetail/ItemValueChart'
import { ItemHoardersTab } from '@renderer/components/values/itemdetail/ItemHoardersTab'
import { ItemDupesTab } from '@renderer/components/values/itemdetail/ItemDupesTab'
import { ItemSuggestionsTab } from '@renderer/components/values/itemdetail/ItemSuggestionsTab'
import { ItemChangelogsTab } from '@renderer/components/values/itemdetail/ItemChangelogsTab'
import { ItemSimilarTab } from '@renderer/components/values/itemdetail/ItemSimilarTab'
import { itemDetailApi } from '@renderer/lib/itemDetailApi'
import { CategoryIconBadge, getCategoryColor, getCategoryIcon } from '@renderer/lib/categoryIcons'
import { getItemImagePath, handleImageError } from '@renderer/lib/itemValueUtils'
import type { ValueHistoryEntry } from '@shared/itemDetail'
import type { Item } from '@shared/item'

const INITIAL_DESCRIPTION_LENGTH = 500

type DetailTab = 'details' | 'charts' | 'changes' | 'suggestions' | 'dupes' | 'hoarders' | 'similar'

const TABS: readonly { value: DetailTab; label: string }[] = [
  { value: 'details', label: 'Details' },
  { value: 'charts', label: 'Charts' },
  { value: 'changes', label: 'Changes' },
  { value: 'suggestions', label: 'Suggestions' },
  { value: 'dupes', label: 'Dupes' },
  { value: 'hoarders', label: 'Hoarders' },
  { value: 'similar', label: 'Similar Items' }
]

function ArrowLeftIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
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

export function ItemDetailScreen({ item }: { item: Item }): React.JSX.Element {
  const { selectItem } = useValues()
  const relativeUpdated = useRelativeTime(item.last_updated)
  const [visibleLength, setVisibleLength] = useState(INITIAL_DESCRIPTION_LENGTH)
  const [activeTab, setActiveTab] = useState<DetailTab>('details')
  const [history, setHistory] = useState<ValueHistoryEntry[] | null>(null)
  const [historyError, setHistoryError] = useState(false)

  useEffect(() => {
    setActiveTab('details')
    setVisibleLength(INITIAL_DESCRIPTION_LENGTH)
    setHistory(null)
    setHistoryError(false)
  }, [item.id])

  useEffect(() => {
    if (activeTab !== 'charts' || history !== null) return
    itemDetailApi
      .valueHistory(item.id)
      .then(setHistory)
      .catch(() => setHistoryError(true))
  }, [activeTab, item.id, history])

  const categoryColor = getCategoryColor(item.type)
  const CategoryIcon = getCategoryIcon(item.type)
  const hasDescription = item.description && item.description !== 'N/A' && item.description !== ''
  const hasMetrics = item.id !== 587 && item.metadata && Object.keys(item.metadata).length > 0

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex min-w-0 items-center gap-3 border-b border-border-primary px-3 py-3 sm:px-5">
        <button
          type="button"
          onClick={() => selectItem(null)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
          aria-label="Back to values"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <h2 className="min-w-0 truncate text-sm font-semibold text-primary-text">{item.name}</h2>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-5">
        <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-5">
          <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-[minmax(260px,460px)_1fr]">
            <div className="relative min-w-0 w-full overflow-hidden rounded-2xl bg-tertiary-bg" style={{ aspectRatio: '854 / 480' }}>
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

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold text-primary-text">{item.name}</h1>
                <span
                  className="inline-flex h-6 shrink-0 items-center rounded-lg border bg-tertiary-bg/40 px-2.5 text-xs font-medium text-primary-text"
                  style={{ borderColor: categoryColor }}
                >
                  {CategoryIcon && <CategoryIcon className="mr-1.5 h-3 w-3" style={{ color: categoryColor }} />}
                  {item.type}
                </span>
                {item.is_limited === 1 && (
                  <span className="inline-flex h-6 shrink-0 items-center rounded-lg border border-border-card bg-tertiary-bg/40 px-2.5 text-xs font-medium text-primary-text">
                    <ClockIcon className="mr-1.5 h-3 w-3" style={{ color: '#ffd700' }} />
                    Limited
                  </span>
                )}
                {item.is_seasonal === 1 && (
                  <span className="inline-flex h-6 shrink-0 items-center rounded-lg border border-border-card bg-tertiary-bg/40 px-2.5 text-xs font-medium text-primary-text">
                    <SnowflakeIcon className="mr-1.5 h-3 w-3" style={{ color: '#40c0e7' }} />
                    Seasonal
                  </span>
                )}
                {item.tradable === 0 && (
                  <span className="inline-flex h-6 shrink-0 items-center rounded-lg border border-border-card bg-tertiary-bg/40 px-2.5 text-xs font-medium text-primary-text">
                    {item.id === 713 ? 'Reference Only' : 'Non-Tradable'}
                  </span>
                )}
              </div>

              <p className="mt-1.5 text-sm text-secondary-text">
                Created by <CreatorLink creator={item.creator} />
              </p>

              <div className="mt-2 text-sm text-secondary-text">
                {item.last_updated ? (
                  <>
                    Last updated:{' '}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">{relativeUpdated}</span>
                      </TooltipTrigger>
                      <TooltipContent>{formatCustomDate(item.last_updated)}</TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  'Last updated: Never'
                )}
              </div>

              {hasMetrics && (
                <div className="mt-3 rounded-2xl border border-border-card bg-secondary-bg p-4">
                  <div className="text-xs font-semibold tracking-wide text-primary-text uppercase">
                    Official Trading Metrics
                  </div>
                  <div className="text-xs text-secondary-text">
                    by Badimo
                    {item.metadata?.LastUpdated ? ` • updated ${formatCustomDate(item.metadata.LastUpdated)}` : ''}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {typeof item.metadata?.TimesTraded === 'number' && (
                      <div className="rounded-md border border-border-card bg-tertiary-bg p-3">
                        <div className="text-xs text-secondary-text">Times Traded</div>
                        <div className="text-lg font-semibold text-primary-text">
                          {item.metadata.TimesTraded.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {typeof item.metadata?.UniqueCirculation === 'number' && (
                      <div className="rounded-md border border-border-card bg-tertiary-bg p-3">
                        <div className="text-xs text-secondary-text">Unique Circulation</div>
                        <div className="text-lg font-semibold text-primary-text">
                          {item.metadata.UniqueCirculation.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {typeof item.metadata?.DemandMultiple === 'number' && (
                      <div className="rounded-md border border-border-card bg-tertiary-bg p-3">
                        <div className="text-xs text-secondary-text">Demand Multiple</div>
                        <div className="text-lg font-semibold text-primary-text">
                          {item.metadata.DemandMultiple.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 overflow-x-auto border-b border-border-primary">
            <div className="flex w-max min-w-full gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={`shrink-0 border-b-2 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors sm:px-3 sm:py-2 sm:text-sm ${
                    activeTab === tab.value
                      ? 'border-button-info text-primary-text'
                      : 'border-transparent text-secondary-text hover:text-primary-text'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'details' && (
            <div className="flex flex-col gap-5">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-primary-text">Description</h3>
                <div className="leading-relaxed text-secondary-text">
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

              <ItemValuesPanel item={item} />
            </div>
          )}

          {activeTab === 'charts' &&
            (historyError ? (
              <p className="py-8 text-center text-sm text-status-error">Failed to load value history.</p>
            ) : history === null ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
              </div>
            ) : (
              <ItemValueChart history={history} />
            ))}

          {activeTab === 'changes' && <ItemChangelogsTab itemId={item.id} />}
          {activeTab === 'suggestions' && <ItemSuggestionsTab itemId={item.id} />}
          {activeTab === 'dupes' && <ItemDupesTab itemId={item.id} />}
          {activeTab === 'hoarders' && <ItemHoardersTab itemName={item.name} itemType={item.type} />}
          {activeTab === 'similar' && <ItemSimilarTab item={item} />}
        </div>
      </div>
    </div>
  )
}
