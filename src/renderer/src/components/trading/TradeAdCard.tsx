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
import { sideTotalValue, isTradeExpired } from '@renderer/lib/tradeDisplay'
import { getCustomTradeTypeIconUrl, isCustomTradeItemId, type TradeAd, type TradeItemWire } from '@shared/trading'
import { Button } from '@renderer/components/ui/button'

function ItemTile({ item }: { item: TradeItemWire }): React.JSX.Element {
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

function ItemThumbnails({ items }: { items: TradeItemWire[] }): React.JSX.Element {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {items.map((item, i) => (
        <ItemTile key={`${item.id}-${i}`} item={item} />
      ))}
    </div>
  )
}

export function TradeAdCard({
  ad,
  onOpenDetail,
  onDelete
}: {
  ad: TradeAd
  onOpenDetail: (id: number) => void
  onDelete: (id: number) => void
}): React.JSX.Element {
  const { user: currentUser } = useCurrentUser()
  const created = useRelativeTime(ad.created_at)
  const expired = isTradeExpired(ad)
  const isOwner = currentUser?.id === ad.author
  const [avatarFailed, setAvatarFailed] = useState(false)
  const avatar = ad.user?.roblox_avatar ?? null
  const label = ad.user?.global_name || ad.user?.username || `User #${ad.author.slice(-6)}`

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border-card bg-secondary-bg p-3">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {avatar && !avatarFailed ? (
            <img
              src={avatar}
              alt=""
              onError={() => setAvatarFailed(true)}
              className="h-7 w-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tertiary-bg text-[10px] font-semibold text-secondary-text">
              {label.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary-text">{label}</span>
        </div>
        {expired && (
          <span className="shrink-0 rounded-full bg-status-error/15 px-2 py-0.5 text-[10px] font-semibold text-status-error">
            Expired
          </span>
        )}
        <span className="shrink-0 text-[11px] text-quaternary-text">{created ?? 'just now'}</span>
        <div className="flex shrink-0 items-center gap-2">
          {isOwner && (
            <Button type="button" size="sm" variant="secondary" onClick={() => onDelete(ad.id)}>
              Delete
            </Button>
          )}
          <Button type="button" size="sm" onClick={() => onOpenDetail(ad.id)}>
            {isOwner ? 'View Offers' : 'Details'}
          </Button>
        </div>
      </div>

      {ad.note && <p className="line-clamp-2 text-xs text-secondary-text">{ad.note}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-bold tracking-wide text-quaternary-text uppercase">Offering</p>
          <ItemThumbnails items={ad.offering} />
        </div>
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-bold tracking-wide text-quaternary-text uppercase">Requesting</p>
          <ItemThumbnails items={ad.requesting} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border-primary pt-2">
        <p className="text-xs font-semibold text-primary-text">{formatFullValue(String(sideTotalValue(ad.offering)))}</p>
        <p className="text-xs font-semibold text-primary-text">{formatFullValue(String(sideTotalValue(ad.requesting)))}</p>
      </div>
    </div>
  )
}
