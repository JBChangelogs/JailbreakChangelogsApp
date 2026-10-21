import { useState } from 'react'
import { CategoryIconBadge } from '@renderer/lib/categoryIcons'
import {
  formatFullValue,
  getDemandColor,
  getItemImagePath,
  getTrendColor,
  handleImageError
} from '@renderer/lib/itemValueUtils'
import type { Item } from '@shared/item'

export type Condition = 'clean' | 'duped' | 'og'

export const conditionFlags = (c: Condition): { duped: boolean; og: boolean } => ({
  duped: c === 'duped',
  og: c === 'og'
})

const CONDITION_STYLES: Record<Condition, string> = {
  clean: 'bg-status-success text-form-button-text',
  duped: 'bg-status-error text-form-button-text',
  og: 'border border-[#FFD700]/50 bg-[#FFD700]/10 text-primary-text'
}
const CONDITION_LABELS: Record<Condition, string> = { clean: 'Clean', duped: 'Duped', og: 'OG' }

function ValueRow({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary-bg p-1.5">
      <span className="shrink-0 text-xs font-medium whitespace-nowrap text-secondary-text">{label}</span>
      {children}
    </div>
  )
}

const pill = 'inline-flex h-6 max-w-36 min-w-0 items-center truncate rounded-md px-2 text-xs leading-none font-bold'

function demandFor(item: Item | undefined, duped: boolean): string {
  const raw = duped ? item?.duped_demand : item?.demand
  return raw && raw !== 'N/A' ? raw : duped ? 'N/A' : 'Unknown'
}

function trendFor(item: Item | undefined): string {
  return item?.trend && item.trend !== 'N/A' ? item.trend : 'Unknown'
}

// Card in the Browse grid. Mirrors the website's item picker card.
export function BrowseItemCard({
  item,
  fixedCondition,
  onAdd
}: {
  item: Item
  // Inventory rows already know their condition.
  fixedCondition?: Condition
  onAdd: (side: 'offering' | 'requesting', condition: Condition) => void
}): React.JSX.Element {
  const [picked, setPicked] = useState<Condition>('clean')
  const condition = fixedCondition ?? picked
  const duped = condition === 'duped'

  return (
    <div className="flex flex-col rounded-lg border border-border-card bg-tertiary-bg p-2">
      <div className="mb-2">
        <p className="mb-1.5 truncate text-xs font-semibold text-primary-text" title={item.name}>
          {item.name}
        </p>
        <div className="flex flex-wrap gap-1">
          {(fixedCondition ? [fixedCondition] : (['clean', 'duped', 'og'] as const)).map((c) => (
            <button
              key={c}
              type="button"
              disabled={!!fixedCondition}
              onClick={() => setPicked(c)}
              className={`rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors disabled:cursor-default ${
                condition === c
                  ? c === 'og'
                    ? CONDITION_STYLES.og
                    : `border-transparent ${CONDITION_STYLES[c]}`
                  : 'border-border-card bg-secondary-bg text-secondary-text hover:text-primary-text'
              }`}
            >
              {CONDITION_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-1.5 aspect-video w-full overflow-hidden rounded-lg bg-secondary-bg">
        <img
          src={getItemImagePath(item.type, item.name)}
          alt=""
          onError={handleImageError}
          className="h-full w-full object-cover"
          draggable={false}
          loading="lazy"
          decoding="async"
        />
        <div className="absolute top-1 right-1">
          <CategoryIconBadge
            type={item.type}
            isLimited={item.is_limited === 1}
            isSeasonal={item.is_seasonal === 1}
            className="h-3.5 w-3.5"
          />
        </div>
      </div>

      {item.tradable === 0 && (
        <span className="mb-1.5 self-start rounded border border-border-card bg-secondary-bg px-1.5 py-0.5 text-[10px] font-medium text-secondary-text">
          Non-Tradable
        </span>
      )}
      <div className="space-y-1 text-xs">
        <ValueRow label={duped ? 'Duped' : 'Cash'}>
          <span className={`${pill} bg-button-info text-form-button-text`}>
            {formatFullValue(duped ? item.duped_value : item.cash_value)}
          </span>
        </ValueRow>
        <ValueRow label="Demand">
          <span className={`${pill} ${getDemandColor(demandFor(item, duped))}`}>{demandFor(item, duped)}</span>
        </ValueRow>
        <ValueRow label="Trend">
          <span className={`${pill} ${getTrendColor(trendFor(item))}`}>{trendFor(item)}</span>
        </ValueRow>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-1.5 pt-2">
        <button
          type="button"
          onClick={() => onAdd('offering', condition)}
          className="rounded-lg bg-status-success py-1.5 text-xs font-semibold text-form-button-text transition-opacity hover:opacity-90"
        >
          Offer
        </button>
        <button
          type="button"
          onClick={() => onAdd('requesting', condition)}
          className="rounded-lg bg-status-error py-1.5 text-xs font-semibold text-form-button-text transition-opacity hover:opacity-90"
        >
          Request
        </button>
      </div>
    </div>
  )
}
