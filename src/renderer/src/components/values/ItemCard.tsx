import { useValues } from '@renderer/contexts/ValuesContext'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useRelativeTime } from '@renderer/hooks/useRelativeTime'
import { CategoryIconBadge, getCategoryColor } from '@renderer/lib/categoryIcons'
import {
  formatFullValue,
  getDemandColor,
  getItemImagePath,
  getTrendColor,
  getValueChange,
  handleImageError
} from '@renderer/lib/itemValueUtils'
import type { Item } from '@shared/item'

function InfoIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v5m0-8h.01" />
    </svg>
  )
}

function ArrowIcon({ className, direction }: { className?: string; direction: 'up' | 'down' }): React.JSX.Element {
  return (
    <svg
      className={`${className} ${direction === 'down' ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 4a1 1 0 0 1 .78.375l6 7.5A1 1 0 0 1 18 13.5h-3v6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-6H6a1 1 0 0 1-.78-1.625l6-7.5A1 1 0 0 1 12 4Z" />
    </svg>
  )
}

function formatChange(difference: number): string {
  return Math.abs(difference).toLocaleString()
}

function ValueBadge({
  value,
  change
}: {
  value: string
  change: { oldValue: string; difference: number } | null
}): React.JSX.Element {
  return (
    <div className="flex w-full items-center gap-1">
      <span className="flex h-6 flex-1 items-center justify-center rounded-lg bg-button-info px-2 text-xs leading-none font-bold text-form-button-text">
        {value}
      </span>
      {change && change.difference !== 0 && (
        <ArrowIcon
          direction={change.difference > 0 ? 'up' : 'down'}
          className={`h-4 w-4 shrink-0 ${change.difference > 0 ? 'text-status-success' : 'text-button-danger'}`}
        />
      )}
    </div>
  )
}

export function ItemCard({ item }: { item: Item }): React.JSX.Element {
  const { selectItem } = useValues()
  const relativeUpdated = useRelativeTime(item.last_updated)

  const cashChange = getValueChange(item.recent_changes, 'cash_value')
  const dupedChange = getValueChange(item.recent_changes, 'duped_value')
  const demandLabel = !item.demand || item.demand === 'N/A' ? 'Unknown' : item.demand
  const dupedDemandLabel = !item.duped_demand || item.duped_demand === 'N/A' ? 'N/A' : item.duped_demand
  const trendLabel = item.trend === null || item.trend === 'N/A' ? 'Unknown' : item.trend
  const hasNotes = Boolean(item.notes && item.notes !== 'N/A' && item.notes.trim() !== '')

  return (
    <button
      type="button"
      onClick={() => selectItem(item.id)}
      className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-border-card bg-secondary-bg text-left transition-all duration-300 hover:shadow-lg"
    >
      <div className="relative w-full overflow-hidden bg-tertiary-bg" style={{ aspectRatio: '854 / 480' }}>
        <div className="absolute top-2 right-2 z-10">
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

      <div className="flex flex-1 flex-col w-full gap-1.5 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-primary-text transition-colors group-hover:text-link">
            {item.name}
          </h3>
          {hasNotes && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex shrink-0 items-center justify-center rounded-md border border-border-card bg-tertiary-bg p-1 text-secondary-text">
                  <InfoIcon className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>{item.notes}</TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex h-5 items-center rounded-lg border bg-tertiary-bg/40 px-2 text-[10px] font-medium text-primary-text"
            style={{ borderColor: getCategoryColor(item.type) }}
          >
            {item.type}
          </span>
          {item.tradable === 0 && (
            <span className="inline-flex h-5 items-center rounded-lg border border-border-card bg-tertiary-bg/40 px-2 text-[10px] font-medium text-primary-text">
              Non-Tradable
            </span>
          )}
          {cashChange && cashChange.difference !== 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={`text-[10px] font-semibold ${cashChange.difference > 0 ? 'text-status-success' : 'text-button-danger'
                    }`}
                >
                  {cashChange.difference > 0 ? '+' : '-'}
                  {formatChange(cashChange.difference)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Cash Value {cashChange.difference > 0 ? 'increased' : 'decreased'} by {formatChange(cashChange.difference)}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="grid grid-cols-2 rounded-lg border border-border-card bg-tertiary-bg">
          <div className="flex flex-col gap-1 p-2">
            <span className="text-xs font-semibold text-primary-text">Clean</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium text-secondary-text">Value</span>
              <ValueBadge value={formatFullValue(item.cash_value)} change={cashChange} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium text-secondary-text">Demand</span>
              <span
                className={`flex w-full items-center justify-center rounded-lg px-2 py-1 text-xs leading-none font-bold ${getDemandColor(item.demand)}`}
              >
                {demandLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 border-l border-border-card p-2">
            <span className="text-xs font-semibold text-primary-text">Duped</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium text-secondary-text">Value</span>
              <ValueBadge value={formatFullValue(item.duped_value)} change={dupedChange} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium text-secondary-text">Demand</span>
              <span
                className={`flex w-full items-center justify-center rounded-lg px-2 py-1 text-xs leading-none font-bold ${getDemandColor(dupedDemandLabel)}`}
              >
                {dupedDemandLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border-card bg-tertiary-bg p-2">
          <span className="text-xs font-medium text-secondary-text">Trend</span>
          <span className={`inline-flex h-6 items-center rounded-lg px-2 text-xs leading-none font-bold ${getTrendColor(item.trend || 'N/A')}`}>
            {trendLabel}
          </span>
        </div>

        <span className="mt-auto pt-0.5 text-[10px] text-secondary-text">Last updated {relativeUpdated ?? 'just now'}</span>
      </div>
    </button>
  )
}
