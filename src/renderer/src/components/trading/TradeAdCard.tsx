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
  return avatar && !failed ? (
    <img src={avatar} alt="" onError={() => setFailed(true)} className={`${className} shrink-0 rounded-full object-cover`} />
  ) : (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-tertiary-bg text-[10px] font-semibold text-secondary-text`}
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  )
}

export function tradeUserLabel(user: TradeAdUser | null | undefined, fallbackId?: string): string {
  return user?.global_name || user?.username || (fallbackId ? `User #${fallbackId.slice(-6)}` : 'Someone')
}

function ItemThumbnails({ items }: { items: TradeItemWire[] }): React.JSX.Element {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {items.map((item, i) => (
        <ItemTile key={`${item.id}-${i}`} item={item} />
      ))}
    </div>
  )
}

export function SideTotals({ items }: { items: TradeItemWire[] }): React.JSX.Element | null {
  const value = sideValue(items)
  if (value.total === 0) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
      <span className="inline-flex h-5 items-center rounded-md border border-border-card bg-quaternary-bg px-2 font-medium text-primary-text">
        Total: {formatFullValue(String(value.total))}
      </span>
      {value.hasDuped && (
        <>
          <span className="inline-flex h-5 items-center rounded-md bg-status-success/80 px-2 font-medium text-form-button-text">
            Cash: {formatFullValue(String(value.cash))}
          </span>
          <span className="inline-flex h-5 items-center rounded-md bg-status-error/80 px-2 font-medium text-form-button-text">
            Duped: {formatFullValue(String(value.duped))}
          </span>
        </>
      )}
    </div>
  )
}

function TradeSide({ label, items }: { label: string; items: TradeItemWire[] }): React.JSX.Element {
  return (
    <section className="min-w-0">
      <h3 className="mb-2 text-xs font-semibold text-primary-text">
        {label} <span className="font-medium text-secondary-text">({items.length})</span>
      </h3>
      <ItemThumbnails items={items} />
      <SideTotals items={items} />
    </section>
  )
}

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

  return (
    <div className="overflow-hidden rounded-xl border border-border-card bg-secondary-bg">
      <div className="flex items-center gap-3 border-b border-border-card bg-tertiary-bg px-3 py-2">
        <TradeUserAvatar user={ad.user} label={label} className="h-10 w-10 border border-border-card" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-primary-text">{label}</p>
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
        {ad.note && <p className="mb-3 line-clamp-2 text-xs text-secondary-text">{ad.note}</p>}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TradeSide label="Offering" items={ad.offering} />
          <TradeSide label="Requesting" items={ad.requesting} />
        </div>
      </div>
    </div>
  )
}
