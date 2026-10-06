import { RobloxAvatar } from '@renderer/components/dupefinder/RobloxAvatar'
import { getDupedValueForItem } from '@renderer/lib/dupeUtils'
import { getItemImagePath, handleImageError } from '@renderer/lib/itemValueUtils'
import { CategoryIconBadge, getCategoryColor, getCategoryIcon } from '@renderer/lib/categoryIcons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import type { DupeFinderItem } from '@shared/dupe'
import type { Item } from '@shared/item'

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num)
}

function formatLoggedDate(timestamp: number): string {
  const ms = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DupeItemCard({
  item,
  itemData,
  ownerId,
  ownerName,
  duplicateNumber,
  onClick
}: {
  item: DupeFinderItem
  itemData: Item
  ownerId: string
  ownerName: string
  duplicateNumber?: number
  onClick: () => void
}): React.JSX.Element {
  const dupedValue = getDupedValueForItem(itemData)
  const CategoryIcon = getCategoryIcon(item.categoryTitle)
  const monthlyUnique = itemData.metadata?.UniqueCirculation ?? item.uniqueCirculation
  const monthlyTraded = itemData.metadata?.TimesTraded

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-border-card bg-secondary-bg text-left transition-shadow hover:shadow-lg"
    >
      <div className="relative w-full overflow-hidden bg-tertiary-bg" style={{ aspectRatio: '854 / 480' }}>
        {duplicateNumber != null && (
          <div className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-button-danger text-xs font-bold text-form-button-text">
            #{duplicateNumber}
          </div>
        )}
        {(itemData.is_limited === 1 || itemData.is_seasonal === 1) && (
          <div className="absolute top-2 right-2 z-10">
            <CategoryIconBadge
              type={item.categoryTitle}
              isLimited={itemData.is_limited === 1}
              isSeasonal={itemData.is_seasonal === 1}
              className="h-4 w-4"
            />
          </div>
        )}
        {(typeof item.season === 'number' || item.level != null) && (
          <div className="absolute right-2 bottom-2 z-10 flex items-center gap-1">
            {typeof item.season === 'number' && (
              <span className="inline-flex h-6 items-center rounded-lg bg-button-info px-2 text-xs font-bold text-form-button-text">
                S{item.season}
              </span>
            )}
            {item.level != null && (
              <span className="inline-flex h-6 items-center rounded-lg bg-status-success px-2 text-xs font-bold text-form-button-text">
                Lvl {item.level}
              </span>
            )}
          </div>
        )}
        <img
          src={getItemImagePath(item.categoryTitle, item.title)}
          alt={item.title}
          onError={handleImageError}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>

      <div className="flex w-full flex-1 flex-col gap-1.5 p-2.5">
        <h3 className="truncate text-sm font-semibold text-primary-text">{item.title}</h3>

        <span
          className="inline-flex h-5 w-fit items-center gap-1.5 rounded-lg border bg-tertiary-bg/40 px-2 text-[10px] font-medium text-primary-text"
          style={{ borderColor: getCategoryColor(item.categoryTitle) }}
        >
          {CategoryIcon && <CategoryIcon className="h-3 w-3" style={{ color: getCategoryColor(item.categoryTitle) }} />}
          {item.categoryTitle}
        </span>

        <div className="grid grid-cols-2 rounded-lg border border-border-card bg-tertiary-bg">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-help flex-col items-center gap-0.5 p-2 text-center">
                <span className="text-[10px] font-medium text-secondary-text">Monthly Unique</span>
                <span className="text-sm font-bold text-primary-text">{monthlyUnique ? formatNumber(monthlyUnique) : 'N/A'}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Monthly unique: {monthlyUnique?.toLocaleString() ?? 'N/A'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex cursor-help flex-col items-center gap-0.5 border-l border-border-card p-2 text-center">
                <span className="text-[10px] font-medium text-secondary-text">Monthly Traded</span>
                <span className="text-sm font-bold text-primary-text">{monthlyTraded ? formatNumber(monthlyTraded) : 'N/A'}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Monthly traded: {monthlyTraded?.toLocaleString() ?? 'N/A'}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border-card bg-tertiary-bg p-2">
          <span className="text-xs font-medium text-secondary-text">Duped Value</span>
          <span className="text-sm font-bold text-primary-text">{dupedValue > 0 ? `$${dupedValue.toLocaleString()}` : 'N/A'}</span>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-lg border border-border-card bg-tertiary-bg p-2">
          <span className="text-xs font-medium text-secondary-text">Current Owner</span>
          <span className="flex min-w-0 items-center gap-1.5">
            <RobloxAvatar userId={ownerId} label={ownerName} className="h-5 w-5" />
            <span className="truncate text-xs font-semibold text-link">{ownerName}</span>
          </span>
        </div>

        <span className="mt-auto pt-0.5 text-[10px] text-secondary-text">
          Logged {formatLoggedDate(item.logged_at)} · {item.history?.length ?? 0} owner{item.history?.length === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  )
}
