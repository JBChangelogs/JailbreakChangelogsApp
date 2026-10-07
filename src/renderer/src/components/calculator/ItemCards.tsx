import { useState } from 'react'
import { CategoryIconBadge } from '@renderer/lib/categoryIcons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import {
  formatFullValue,
  getDemandColor,
  getItemImagePath,
  getTrendColor,
  handleImageError,
  parseCashValue
} from '@renderer/lib/itemValueUtils'
import type { TradeItemDraft } from '@renderer/lib/tradeItemDraft'
import type { Item } from '@shared/item'

export type Condition = 'clean' | 'duped' | 'og'

const conditionOf = (d: { duped: boolean; og: boolean }): Condition => (d.duped ? 'duped' : d.og ? 'og' : 'clean')
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

function Icon({ d, className }: { d: string; className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

function Chip({ label, colorClass }: { label: string; colorClass: string }): React.JSX.Element {
  return (
    <span className={`inline-flex h-5 max-w-full items-center truncate rounded px-1.5 text-[10px] leading-none font-bold ${colorClass}`}>
      {label}
    </span>
  )
}

function ValueRow({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-secondary-bg p-1.5">
      <span className="shrink-0 text-xs font-medium whitespace-nowrap text-secondary-text">{label}</span>
      {children}
    </div>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="text-[10px] font-medium text-tertiary-text">{label}</span>
      {children}
    </span>
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

// Compact row in the Offering/Requesting panels: fits half-width panels better than tall cards.
export function SelectedItemCard({
  draft,
  item,
  onAddOne,
  onRemoveOne,
  onCondition
}: {
  draft: TradeItemDraft
  item: Item | undefined
  onAddOne: () => void
  onRemoveOne: () => void
  onCondition: (next: Condition) => void
}): React.JSX.Element {
  const condition = conditionOf(draft)
  const unit = draft.duped ? draft.dupedValue : draft.cashValue
  const unitValue = parseCashValue(unit ?? null)
  const demand = demandFor(item, draft.duped)
  const trend = trendFor(item)
  const step =
    'flex h-5 w-5 items-center justify-center rounded text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text'

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-card bg-tertiary-bg p-2 transition-colors hover:bg-quaternary-bg/40">
      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-quaternary-bg/40">
        <img
          src={getItemImagePath(draft.type, draft.name)}
          alt=""
          onError={handleImageError}
          className="h-full w-full object-cover"
          draggable={false}
        />
        <div className="pointer-events-none absolute top-0.5 right-0.5 scale-75">
          <CategoryIconBadge
            type={draft.type}
            isLimited={item?.is_limited === 1}
            isSeasonal={item?.is_seasonal === 1}
            className="h-3.5 w-3.5"
          />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-primary-text" title={draft.name}>
            {draft.name}
          </p>
          <p className="shrink-0 text-sm font-bold text-primary-text tabular-nums">
            {unitValue > 0 ? formatFullValue(String(unitValue * draft.amount)) : formatFullValue(unit ?? null)}
          </p>
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-[11px] text-tertiary-text">
            {draft.type}
            {draft.amount > 1 && unitValue > 0 && ` · ${formatFullValue(unit ?? null)} each`}
          </p>
          <div className="flex shrink-0 items-center rounded-md border border-border-card bg-secondary-bg">
            <button
              type="button"
              onClick={onRemoveOne}
              className={step}
              aria-label={draft.amount > 1 ? `Remove one ${draft.name}` : `Remove ${draft.name}`}
            >
              <Icon d="M5 12h14" className="h-3 w-3" />
            </button>
            <span className="min-w-5 text-center text-[11px] font-bold text-primary-text tabular-nums">
              {draft.amount}
            </span>
            <button type="button" onClick={onAddOne} className={step} aria-label={`Add another ${draft.name}`}>
              <Icon d="M12 5v14m7-7H5" className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <Labeled label="Condition">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Condition: ${CONDITION_LABELS[condition]}`}
                  className={`inline-flex h-5 items-center gap-1 rounded px-1.5 text-[10px] leading-none font-semibold transition-opacity hover:opacity-90 ${CONDITION_STYLES[condition]}`}
                >
                  {CONDITION_LABELS[condition]}
                  <Icon d="m6 9 6 6 6-6" className="h-2.5 w-2.5 opacity-80" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup value={condition} onValueChange={(value) => onCondition(value as Condition)}>
                  <DropdownMenuRadioItem value="clean">Clean</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="duped">Duped</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="og">OG</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </Labeled>
          <Labeled label="Demand">
            <Chip label={demand} colorClass={getDemandColor(demand)} />
          </Labeled>
          <Labeled label="Trend">
            <Chip label={trend} colorClass={getTrendColor(trend)} />
          </Labeled>
        </div>
      </div>
    </div>
  )
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
  const hasValue = !!item.cash_value && item.cash_value !== 'N/A'

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

      {item.tradable === 0 && hasValue && (
        <span className="mb-1.5 self-start rounded border border-border-card bg-secondary-bg px-1.5 py-0.5 text-[10px] font-medium text-secondary-text">
          Non-Tradable
        </span>
      )}
      {/* Some non-tradable items (e.g. HyperShift) still have values worth showing. */}
      {!hasValue ? (
        <p className="rounded-lg bg-secondary-bg p-1.5 text-center text-xs font-medium text-secondary-text">
          {item.tradable === 0 ? 'Non-Tradable' : 'No value yet'}
        </p>
      ) : (
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
      )}

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
