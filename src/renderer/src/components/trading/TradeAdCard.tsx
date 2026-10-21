import { useState } from 'react'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { useRelativeTime } from '@renderer/hooks/useRelativeTime'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import {
  formatFullValue,
  getDemandColor,
  getItemImagePath,
  getTrendColor,
  handleImageError
} from '@renderer/lib/itemValueUtils'
import { getCategoryColor, getCategoryIcon } from '@renderer/lib/categoryIcons'
import { UserBadges } from '@renderer/components/user/UserBadges'
import { sideValue, isTradeExpired, formatTimeLeft } from '@renderer/lib/tradeDisplay'
import {
  getCustomTradeTypeIconUrl,
  isCustomTradeItemId,
  type TradeAd,
  type TradeAdUser,
  type TradeItemWire
} from '@shared/trading'
import { Button } from '@renderer/components/ui/button'

export function ItemTile({ item }: { item: TradeItemWire }): React.JSX.Element {
  const custom = isCustomTradeItemId(item.id)
  const src = custom
    ? getCustomTradeTypeIconUrl(item.id.replace(' ', '_'))
    : item.name && item.type
      ? getItemImagePath(item.type, item.name)
      : null

  const tile = (
    <div className="flex w-24 shrink-0 flex-col overflow-hidden rounded-lg border border-border-card bg-tertiary-bg">
      <div className="relative aspect-square w-full bg-quaternary-bg/40">
        {src && (
          <img
            src={src}
            alt=""
            onError={handleImageError}
            className={custom ? 'h-full w-full object-contain p-3' : 'h-full w-full object-cover'}
            draggable={false}
          />
        )}
        {(item.amount ?? 1) > 1 && (
          <span className="absolute right-1 bottom-1 rounded bg-primary-bg/80 px-1.5 py-0.5 text-[10px] leading-tight font-bold text-primary-text">
            ×{item.amount}
          </span>
        )}
      </div>
      <div className="px-1.5 py-1.5">
        <p className="truncate text-center text-xs font-medium text-primary-text">{item.name ?? item.id}</p>
        {!custom && item.type && (
          <p className="truncate text-center text-[10px] text-quaternary-text">{item.type}</p>
        )}
      </div>
    </div>
  )

  if (custom) return tile

  const demandLabel = item.info?.demand && item.info.demand !== 'N/A' ? item.info.demand : null
  const trendLabel = item.info?.trend && item.info.trend !== 'N/A' ? item.info.trend : null

  return (
    <Tooltip>
      <TooltipTrigger asChild>{tile}</TooltipTrigger>
      <TooltipContent className="max-w-56">
        <div className="flex flex-col gap-1">
          {(item.duped || item.og || (item.amount ?? 1) > 1) && (
            <div className="flex flex-wrap items-center gap-1">
              {item.duped && (
                <span className="rounded-md border border-border-card bg-tertiary-bg/60 px-1.5 py-0.5 text-[10px] font-medium text-secondary-text">
                  Duped
                </span>
              )}
              {item.og && (
                <span className="rounded-md border border-border-card bg-tertiary-bg/60 px-1.5 py-0.5 text-[10px] font-medium text-secondary-text">
                  OG
                </span>
              )}
              {(item.amount ?? 1) > 1 && (
                <span className="rounded-md border border-border-card bg-tertiary-bg/60 px-1.5 py-0.5 text-[10px] font-medium text-secondary-text">
                  ×{item.amount}
                </span>
              )}
            </div>
          )}
          {item.info?.cash_value && (
            <p className="text-secondary-text">
              Cash Value: <span className="font-medium text-primary-text">{formatFullValue(item.info.cash_value)}</span>
            </p>
          )}
          {item.info?.duped_value && (
            <p className="text-secondary-text">
              Duped Value: <span className="font-medium text-primary-text">{formatFullValue(item.info.duped_value)}</span>
            </p>
          )}
          {(demandLabel || trendLabel) && (
            <div className="flex flex-wrap items-center gap-1">
              {demandLabel && (
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] leading-none font-bold ${getDemandColor(demandLabel)}`}>
                  {demandLabel} Demand
                </span>
              )}
              {trendLabel && (
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] leading-none font-bold ${getTrendColor(trendLabel)}`}>
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export function TradeUserAvatar({
  user,
  label,
  className = 'h-7 w-7'
}: {
  user: TradeAdUser | null | undefined
  label: string
  className?: string
}): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  const avatar = user?.roblox_avatar ?? null
  const shape = user?.premiumtype === 3 ? 'rounded-[25%]' : 'rounded-full'
  return avatar && !failed ? (
    <img src={avatar} alt="" onError={() => setFailed(true)} className={`${className} shrink-0 object-cover ${shape}`} />
  ) : (
    <div
      className={`${className} flex shrink-0 items-center justify-center bg-tertiary-bg text-[10px] font-semibold text-secondary-text ${shape}`}
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  )
}

export function tradeUserLabel(user: TradeAdUser | null | undefined, fallbackId?: string): string {
  return user?.global_name || user?.username || (fallbackId ? `User #${fallbackId.slice(-6)}` : 'Someone')
}

export function SideTotals({ items }: { items: TradeItemWire[] }): React.JSX.Element | null {
  const value = sideValue(items)
  if (value.total === 0) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="inline-flex h-5 items-center rounded-md border border-border-card bg-quaternary-bg px-2 font-medium text-primary-text">
        Total: {formatFullValue(String(value.total))}
      </span>
      <span className="inline-flex h-5 items-center rounded-md bg-status-success/80 px-2 font-medium text-form-button-text">
        Cash: {formatFullValue(String(value.cash))}
      </span>
      <span className="inline-flex h-5 items-center rounded-md bg-status-error/80 px-2 font-medium text-form-button-text">
        Duped: {formatFullValue(String(value.duped))}
      </span>
    </div>
  )
}

/** Same items in the same condition, shown once with a count. */
function groupItems(items: TradeItemWire[]): (TradeItemWire & { count: number })[] {
  const groups = new Map<string, TradeItemWire & { count: number }>()
  for (const item of items) {
    const key = `${item.id}:${item.duped ? 1 : 0}:${item.og ? 1 : 0}`
    const existing = groups.get(key)
    if (existing) existing.count += item.amount ?? 1
    else groups.set(key, { ...item, count: item.amount ?? 1 })
  }
  return [...groups.values()]
}

function CategoryChip({ type }: { type: string }): React.JSX.Element {
  const color = getCategoryColor(type)
  const CategoryIcon = getCategoryIcon(type)
  return (
    <span
      className="inline-flex h-6 items-center gap-1.5 rounded-md border px-2.5 text-xs leading-none font-medium text-primary-text"
      style={{ borderColor: color, backgroundColor: `${color}22` }}
    >
      {CategoryIcon && <CategoryIcon className="h-3 w-3" style={{ color }} />}
      {type}
    </span>
  )
}

function ItemRow({ item }: { item: TradeItemWire & { count: number } }): React.JSX.Element {
  const custom = isCustomTradeItemId(item.id)
  const src = custom
    ? getCustomTradeTypeIconUrl(item.id.replace(' ', '_'))
    : item.name && item.type
      ? getItemImagePath(item.type, item.name)
      : null
  const raw = item.duped ? item.info?.duped_value : item.info?.cash_value
  const value = raw && raw !== 'N/A' ? formatFullValue(raw) : 'N/A'
  const demand = item.info?.demand && item.info.demand !== 'N/A' ? item.info.demand : null
  const trend = item.info?.trend && item.info.trend !== 'N/A' ? item.info.trend : null

  const name = <span className="line-clamp-1 text-sm font-semibold text-primary-text">{item.name ?? item.id}</span>

  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-border-card px-3 py-2 transition-colors last:border-b-0 hover:bg-quaternary-bg">
      <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg border border-white/5 bg-tertiary-bg">
        {src && (
          <img
            src={src}
            alt=""
            onError={handleImageError}
            draggable={false}
            className={custom ? 'h-full w-full object-contain p-2' : 'h-full w-full object-cover'}
          />
        )}
        {item.count > 1 && (
          <span className="absolute top-1.5 right-1.5 rounded-md bg-primary-bg/85 px-1.5 py-0.5 text-[11px] leading-none font-bold text-primary-text">
            ×{item.count}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {custom || (!demand && !trend) ? (
            name
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>{name}</TooltipTrigger>
              <TooltipContent className="flex items-center gap-1">
                {demand && (
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] leading-none font-bold ${getDemandColor(demand)}`}>
                    {demand} Demand
                  </span>
                )}
                {trend && (
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] leading-none font-bold ${getTrendColor(trend)}`}>
                    {trend}
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
          )}
          {item.count > 1 && <span className="shrink-0 text-xs font-semibold text-secondary-text tabular-nums">×{item.count}</span>}
          {!custom && item.type && <CategoryChip type={item.type} />}
          {item.duped && (
            <span className="inline-flex h-6 items-center rounded-md bg-status-error/90 px-2.5 text-xs leading-none font-semibold text-form-button-text">
              Duped
            </span>
          )}
          {item.og && (
            <span className="inline-flex h-6 items-center rounded-md border border-[#FFD700]/50 bg-[#FFD700]/10 px-2.5 text-xs leading-none font-semibold text-primary-text">
              OG
            </span>
          )}
        </div>
        {!custom && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-secondary-text">{item.duped ? 'Duped value' : 'Cash value'}</span>
            <span className="inline-flex h-6 items-center rounded-md bg-button-info px-2.5 text-xs leading-none font-bold text-form-button-text tabular-nums">
              {value}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/** One side of a trade ad as the website shows it: a list of item rows, then its totals. */
export function TradeSidePreview({ title, items }: { title: string; items: TradeItemWire[] }): React.JSX.Element {
  const grouped = groupItems(items)
  return (
    <section className="min-w-0">
      <h3 className="mb-3 text-center text-sm font-semibold text-primary-text">
        {title} <span className="font-medium text-secondary-text">({items.length})</span>
      </h3>
      <div className="rounded-xl border border-border-card bg-tertiary-bg/40">
        <div className="border-b border-border-card px-3 py-2 text-xs font-semibold text-secondary-text">Items</div>
        {grouped.length > 0 ? (
          <div className="max-h-80 overflow-y-auto">
            {grouped.map((item) => (
              <ItemRow key={`${item.id}:${item.duped}:${item.og}`} item={item} />
            ))}
          </div>
        ) : (
          <p className="px-3 py-3 text-xs text-secondary-text">No items listed</p>
        )}
      </div>
      <SideTotals items={items} />
    </section>
  )
}

function SearchIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
    </svg>
  )
}

const NOTE_MAX_LINES = 3
const NOTE_MAX_CHARS = 180

export function TradeAdCard({
  ad,
  onOpenDetail,
  onDelete
}: {
  ad: TradeAd
  onOpenDetail: (id: number, makeOffer?: boolean) => void
  onDelete: (id: number) => void
}): React.JSX.Element {
  const { user: currentUser } = useCurrentUser()
  const created = useRelativeTime(ad.created_at)
  const expired = isTradeExpired(ad)
  const isOwner = currentUser?.id === ad.author
  const label = tradeUserLabel(ad.user, ad.author)
  const robloxName = ad.user?.roblox_username
  const [noteExpanded, setNoteExpanded] = useState(false)
  const note = ad.note ?? ''
  const noteIsLong = note.split(/\r?\n/).length > NOTE_MAX_LINES || note.length > NOTE_MAX_CHARS

  return (
    <div className="overflow-hidden rounded-xl border border-border-card bg-secondary-bg">
      <div className="flex items-center gap-3 border-b border-border-card bg-tertiary-bg px-3 py-2">
        <TradeUserAvatar user={ad.user} label={label} className="h-10 w-10 border border-border-card" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold text-primary-text">{label}</p>
            <UserBadges usernumber={ad.user?.usernumber} premiumType={ad.user?.premiumtype} size="sm" />
          </div>
          {robloxName && <p className="truncate text-xs text-secondary-text">@{robloxName}</p>}
          <p className="mt-0.5 text-xs text-secondary-text">
            Created {created ?? 'just now'}
            <span className="mx-1.5">•</span>
            {expired ? (
              <span className="font-medium text-status-error">Expired</span>
            ) : (
              <>Expires in {formatTimeLeft(ad.expires)}</>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isOwner && (
            <Button type="button" size="sm" variant="secondary" onClick={() => onDelete(ad.id)}>
              Delete
            </Button>
          )}
          <Button type="button" size="sm" onClick={() => onOpenDetail(ad.id)}>
            <SearchIcon className="h-3.5 w-3.5" />
            {isOwner ? 'View Offers' : 'Details'}
          </Button>
          {!isOwner && !expired && (
            <Button type="button" size="sm" variant="secondary" onClick={() => onOpenDetail(ad.id, true)}>
              Make Offer
            </Button>
          )}
        </div>
      </div>

      <div className="p-3">
        {note && (
          <div className="mb-4 min-w-0">
            <p className="mb-1 text-[10px] tracking-wide text-secondary-text uppercase">Trade Note</p>
            <p
              className={`text-sm break-words whitespace-pre-wrap text-primary-text ${noteIsLong && !noteExpanded ? 'line-clamp-3' : ''}`}
            >
              {note}
            </p>
            {noteIsLong && (
              <button
                type="button"
                onClick={() => setNoteExpanded((v) => !v)}
                className="text-sm text-link hover:text-link-hover"
              >
                {noteExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <TradeSidePreview title="Offering" items={ad.offering} />
          <TradeSidePreview title="Requesting" items={ad.requesting} />
        </div>
      </div>
    </div>
  )
}
