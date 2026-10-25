import { useEffect, useRef } from 'react'
import { useTradeHistory, type DetailState } from '@renderer/contexts/TradeHistoryContext'
import { RobloxAvatar } from '@renderer/components/dupefinder/RobloxAvatar'
import { formatDay, TradeActivityChart } from '@renderer/components/tradehistory/TradeActivityChart'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { Button } from '@renderer/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { userDisplay } from '@renderer/lib/dupeDisplay'
import { normalizeToMs } from '@renderer/lib/messageFormatting'
import { getCategoryColor } from '@renderer/lib/categoryIcons'
import { getItemImagePath, handleImageError } from '@renderer/lib/itemValueUtils'
import type { TradeItemDetail, UserTradeSummary } from '@renderer/lib/tradeHistoryApi'
import type { RobloxUserSummary } from '@shared/dupe'

function ArrowsIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  )
}

const formatTradeTime = (timestamp: number): string => {
  const date = new Date(normalizeToMs(timestamp))
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

const formatCash = (value: number): string => `$${Math.round(value).toLocaleString()}`

const formatCompact = (value: number): string => {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(1)}K`
  return `$${Math.round(abs).toLocaleString()}`
}

function summarize(items: TradeItemDetail[], valueOf: (item: TradeItemDetail) => number | null): { total: number; missing: number } {
  return items.reduce(
    (sum, item) => {
      const value = valueOf(item)
      if (value === null) sum.missing += 1
      else sum.total += value
      return sum
    },
    { total: 0, missing: 0 }
  )
}

function ValueDifference({ value, partial }: { value: number; partial: boolean }): React.JSX.Element {
  const tone =
    value > 0
      ? 'border-status-success/40 bg-status-success/10 text-status-success'
      : value < 0
        ? 'border-status-error/40 bg-status-error/10 text-status-error'
        : 'border-border-card bg-tertiary-bg text-secondary-text'
  const badge = (
    <span className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-bold tabular-nums ${tone}`}>
      {partial && '~'}
      {value > 0 ? '+' : value < 0 ? '−' : ''}
      {formatCompact(value)}
    </span>
  )
  if (!partial) return badge
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>Some items in this trade have no value yet</TooltipContent>
    </Tooltip>
  )
}

function Tag({ children, title }: { children: React.ReactNode; title?: string }): React.JSX.Element {
  const tag = (
    <span className="rounded-md border border-border-card bg-tertiary-bg/60 px-1.5 py-0.5 text-[10px] font-medium text-secondary-text">
      {children}
    </span>
  )
  if (!title) return tag
  return (
    <Tooltip>
      <TooltipTrigger asChild>{tag}</TooltipTrigger>
      <TooltipContent className="max-w-56">{title}</TooltipContent>
    </Tooltip>
  )
}

function TradeItemTile({ item, value }: { item: TradeItemDetail; value: number | null }): React.JSX.Element {
  const color = getCategoryColor(item.category_title)
  return (
    <div className="overflow-hidden rounded-lg border border-border-card bg-tertiary-bg">
      <div className="relative aspect-video bg-secondary-bg">
        <img
          src={getItemImagePath(item.category_title, item.title)}
          alt={item.title}
          loading="lazy"
          onError={handleImageError}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-semibold text-primary-text">{item.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span
            className="rounded-md border px-1.5 py-0.5 text-[10px] font-medium text-primary-text"
            style={{ borderColor: color, backgroundColor: `${color}22` }}
          >
            {item.category_title}
          </span>
          {item.is_duplicate_branch && <Tag>Duped</Tag>}
          {item.given_by_original_owner && <Tag title="The item's original owner gave it in this trade.">OG</Tag>}
          {item.received_by_original_owner && <Tag title="The item went back to its original owner in this trade.">Returned</Tag>}
        </div>
        <p className="mt-1.5 text-xs text-secondary-text tabular-nums">{value === null ? 'No value' : formatCash(value)}</p>
      </div>
    </div>
  )
}

function TradeSide({
  label,
  items,
  pending,
  valueOf
}: {
  label: string
  items: TradeItemDetail[]
  pending: boolean
  valueOf: (item: TradeItemDetail) => number | null
}): React.JSX.Element {
  const { total, missing } = summarize(items, valueOf)
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="truncate text-xs font-bold uppercase tracking-wide text-quaternary-text">{label}</p>
        {items.length > 0 && (
          <p className="shrink-0 text-xs text-secondary-text tabular-nums">
            {missing > 0 && '~'}
            {formatCash(total)}
          </p>
        )}
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-card px-3 py-4 text-center text-xs text-tertiary-text">
          {pending ? 'Not scanned yet' : 'Nothing'}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
          {items.map((item) => (
            <TradeItemTile key={`${item.item_id}-${item.branch_id}`} item={item} value={valueOf(item)} />
          ))}
        </div>
      )}
    </div>
  )
}

function TradeRow({
  trade,
  robloxId,
  profiles,
  expanded,
  detail,
  onToggle,
  onRetry,
  valueOf
}: {
  trade: UserTradeSummary
  robloxId: string
  profiles: Record<string, RobloxUserSummary>
  expanded: boolean
  detail: DetailState | undefined
  onToggle: () => void
  onRetry: () => void
  valueOf: (item: TradeItemDetail) => number | null
}): React.JSX.Element {
  const ready = detail?.status === 'ready' ? detail.detail : null
  const status = ready?.status ?? trade.status
  const gave = ready ? (ready.user_a === robloxId ? ready.items_a_to_b : ready.items_b_to_a) : trade.items_given
  const received = ready ? (ready.user_a === robloxId ? ready.items_b_to_a : ready.items_a_to_b) : trade.items_received
  const ownerName = userDisplay(profiles[robloxId], robloxId)
  const otherName = userDisplay(profiles[trade.counterparty_user_id], trade.counterparty_user_id)
  const gaveSum = summarize(gave, valueOf)
  const receivedSum = summarize(received, valueOf)
  const known = gave.length + received.length - gaveSum.missing - receivedSum.missing
  const difference = ready && status === 'completed' && known > 0 ? receivedSum.total - gaveSum.total : null
  const count = (n: number): string => (status === 'pending' && n === 0 ? '?' : String(n))

  return (
    <article className="overflow-hidden rounded-xl border border-border-card bg-tertiary-bg">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 p-3 text-left transition-colors hover:bg-quaternary-bg/40"
      >
        <div className="flex min-w-0 flex-1 basis-72 items-center gap-2.5">
          <RobloxAvatar userId={robloxId} label={ownerName} className="h-8 w-8 shrink-0" />
          <span className="min-w-0 truncate text-sm font-semibold text-primary-text">{ownerName}</span>
          <span className="hidden shrink-0 items-center gap-1.5 px-1 text-xs text-secondary-text @xl:flex">
            <ArrowsIcon className="h-4 w-4" />
            {count(gave.length)} given · {count(received.length)} received
          </span>
          <RobloxAvatar userId={trade.counterparty_user_id} label={otherName} className="h-8 w-8 shrink-0" />
          <span className="min-w-0 truncate text-sm font-semibold text-primary-text">{otherName}</span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 text-xs text-secondary-text">
          {status === 'pending' && (
            <Tag title="Only one side's items have been scanned so far. The other side is still pending.">Pending</Tag>
          )}
          {trade.confidence === 'partial' && <Tag title="Some details came from a fallback data source.">Recovered</Tag>}
          {difference !== null && <ValueDifference value={difference} partial={gaveSum.missing + receivedSum.missing > 0} />}
          <span className="whitespace-nowrap">{formatTradeTime(trade.last_time)}</span>
          <ChevronIcon className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border-card bg-secondary-bg p-4">
          {detail?.status === 'error' ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <p className="text-sm text-secondary-text">{detail.message}</p>
              <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            </div>
          ) : !ready ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-secondary-text">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
              Loading trade details…
            </div>
          ) : (
            <div className="flex flex-col gap-4 @2xl:flex-row">
              <TradeSide label={`${ownerName} gave`} items={gave} pending={status === 'pending'} valueOf={valueOf} />
              <TradeSide label={`${otherName} gave`} items={received} pending={status === 'pending'} valueOf={valueOf} />
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export function TradeHistoryScreen(): React.JSX.Element {
  const {
    lookup,
    trades,
    listError,
    loadingMore,
    hasMore,
    loadMore,
    retry,
    profiles,
    expandedId,
    toggleTrade,
    details,
    retryDetail,
    itemValue,
    selectedDay,
    selectDay,
    dayTrades
  } = useTradeHistory()
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const robloxId = lookup.status === 'ready' ? lookup.robloxId : null

  const dayStatus = selectedDay ? (dayTrades?.status ?? 'loading') : null
  const visibleTrades = selectedDay ? (dayTrades?.status === 'ready' ? dayTrades.trades : []) : trades

  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = scrollRef.current
    if (!sentinel || !root) return undefined
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
      root,
      rootMargin: '600px'
    })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore, trades.length])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border-primary px-5 py-4">
        <h2 className="shrink-0 text-sm font-semibold text-primary-text">Trade History</h2>
        {robloxId && trades.length > 0 && !selectedDay && (
          <span className="min-w-0 truncate text-xs text-tertiary-text">
            {trades.length}
            {hasMore ? '+' : ''} {trades.length === 1 ? 'trade' : 'trades'}, newest first
          </span>
        )}
      </div>

      <div ref={scrollRef} className="@container min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-5">
        {lookup.status === 'idle' && (
          <EmptyState
            status={{
              icon: 'search',
              tone: 'neutral',
              title: 'Look up a trade history',
              description: 'Search a Roblox username or ID in the sidebar. Link your Roblox account to open on your own trades.'
            }}
          />
        )}

        {lookup.status === 'loading' && (
          <EmptyState status={{ icon: 'spinner', tone: 'neutral', title: 'Finding that account', description: 'Looking up the username.' }} />
        )}

        {lookup.status === 'not-found' && (
          <EmptyState status={{ icon: 'userMinus', tone: 'error', title: 'Account not found', description: lookup.message }} />
        )}

        {robloxId && <TradeActivityChart />}

        {robloxId && selectedDay && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border-card bg-secondary-bg px-3 py-2 text-sm">
            <span className="text-secondary-text">
              Trades on <span className="font-semibold text-primary-text">{formatDay(selectedDay)}</span>
              {dayStatus === 'ready' && ` · ${visibleTrades.length} found`}
            </span>
            <Button type="button" size="sm" variant="secondary" onClick={() => selectDay(null)}>
              Clear
            </Button>
          </div>
        )}

        {robloxId &&
          (visibleTrades.length === 0 ? (
            dayStatus === 'error' ? (
              <div className="flex flex-col items-center gap-3">
                <EmptyState
                  status={{ icon: 'signalSlash', tone: 'error', title: "Couldn't load this day", description: 'Try again in a moment.' }}
                />
                <Button type="button" size="sm" onClick={() => selectDay(selectedDay)}>
                  Try again
                </Button>
              </div>
            ) : !selectedDay && listError ? (
              <div className="flex flex-col items-center gap-3">
                <EmptyState status={{ icon: 'signalSlash', tone: 'error', title: "Couldn't load trades", description: listError }} />
                <Button type="button" size="sm" onClick={retry}>
                  Try again
                </Button>
              </div>
            ) : dayStatus === 'loading' || (!selectedDay && loadingMore) ? (
              <EmptyState
                status={{
                  icon: 'spinner',
                  tone: 'neutral',
                  title: selectedDay ? 'Finding trades' : 'Loading trade history',
                  description: selectedDay ? `Loading trades from ${formatDay(selectedDay)}.` : 'Fetching recorded trades.'
                }}
              />
            ) : (
              <EmptyState
                status={{
                  icon: 'search',
                  tone: 'neutral',
                  title: selectedDay ? 'No trades on this day' : 'No recorded trades',
                  description: selectedDay
                    ? `No trades for ${userDisplay(profiles[robloxId], robloxId)} were found on ${formatDay(selectedDay)}.`
                    : `Trades show up here once an item changing hands is observed for ${userDisplay(profiles[robloxId], robloxId)}.`
                }}
              />
            )
          ) : (
            <div className="space-y-2">
              {visibleTrades.map((trade) => (
                <TradeRow
                  key={trade.trade_id}
                  trade={trade}
                  robloxId={robloxId}
                  profiles={profiles}
                  expanded={expandedId === trade.trade_id}
                  detail={details[trade.trade_id]}
                  onToggle={() => toggleTrade(trade.trade_id)}
                  onRetry={() => retryDetail(trade.trade_id)}
                  valueOf={itemValue}
                />
              ))}
              {!selectedDay && listError ? (
                <div className="flex items-center justify-center gap-3 py-4 text-sm text-secondary-text">
                  {listError}
                  <Button type="button" size="sm" variant="secondary" onClick={retry}>
                    Try again
                  </Button>
                </div>
              ) : (
                hasMore &&
                !selectedDay && (
                  <div ref={sentinelRef} className="flex justify-center py-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
                  </div>
                )
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
