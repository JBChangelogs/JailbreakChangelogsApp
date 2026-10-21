// The calculator's "You give / You receive" panels and their item cards.
// Ported from the website's CalculatorItemGrid.

import { useMemo } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { CategoryIconBadge } from '@renderer/lib/categoryIcons'
import {
  formatFullValue,
  getDemandColor,
  getItemImagePath,
  getTrendColor,
  handleImageError,
  parseCashValue
} from '@renderer/lib/itemValueUtils'
import { sideValue, totalCount, type TradeItemDraft } from '@renderer/lib/tradeItemDraft'
import { useItems } from '@renderer/hooks/useItems'
import { getCustomTradeTypeIconUrl, isCustomTradeItemId } from '@shared/trading'
import type { Item } from '@shared/item'
import type { TradeSide } from '@renderer/hooks/useTradeComposer'

export type Condition = 'clean' | 'duped' | 'og'

export const conditionOf = (d: { duped: boolean; og: boolean }): Condition => (d.duped ? 'duped' : d.og ? 'og' : 'clean')

const CONDITION_STYLES: Record<Condition, string> = {
  clean: 'bg-status-success text-form-button-text',
  duped: 'bg-status-error text-form-button-text',
  og: 'border border-[#FFD700]/50 bg-[#FFD700]/10 text-primary-text'
}
const CONDITION_LABELS: Record<Condition, string> = { clean: 'Clean', duped: 'Duped', og: 'OG' }

function Icon({ d, className }: { d: string; className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const PLUS = 'M12 4.5v15m7.5-7.5h-15'
const MINUS = 'M5 12h14'
const TRASH =
  'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0'
const SWAP = 'M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5'
const INFO = 'M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z'
const CHEVRON = 'm6 9 6 6 6-6'

const known = (value: string | null | undefined): value is string => !!value && value !== 'N/A'

function UnlockBadges({ season, level }: { season?: number | null; level?: string | null }): React.JSX.Element | null {
  const hasLevel = known(level)
  if (season == null && !hasLevel) return null
  const isPercent = hasLevel && level.includes('%')
  const levelLabel = hasLevel ? (isPercent ? `Top ${level}` : `Level ${level}`) : ''
  const tooltip =
    season != null && hasLevel
      ? `Unlocked in Season ${season} at ${levelLabel}.`
      : season != null
        ? `Unlocked in Season ${season}.`
        : `Unlocked at ${levelLabel}.`
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="absolute right-1.5 bottom-1.5 z-10 flex cursor-help items-center gap-1">
          {season != null && (
            <span className="inline-flex h-5 items-center rounded-md bg-button-info px-1.5 text-[10px] leading-none font-bold text-form-button-text">
              S{season}
            </span>
          )}
          {hasLevel && (
            <span className="inline-flex h-5 items-center rounded-md bg-status-success px-1.5 text-[10px] leading-none font-bold text-form-button-text">
              {isPercent ? level : `L${level}`}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

function MarketDetails({ item, duped }: { item: Item | undefined; duped: boolean }): React.JSX.Element {
  const demand = duped ? item?.duped_demand : item?.demand
  const trend = item?.trend
  const row = (label: string, value: string | null | undefined, color: (v: string) => string): React.JSX.Element => (
    <div className="flex min-w-0 items-center gap-1">
      <span className={`shrink-0 text-primary-text ${duped ? 'w-20' : 'w-11'}`}>{label}</span>
      <span className={`min-w-0 truncate rounded-md px-1.5 py-0.5 font-semibold whitespace-nowrap ${color(known(value) ? value : 'Unknown')}`}>
        {known(value) ? value : 'Unknown'}
      </span>
    </div>
  )
  return (
    <div className="space-y-1 border-t border-border-card pt-2 text-[11px]">
      {row(duped ? 'Duped Demand' : 'Demand', demand, getDemandColor)}
      {row('Trend', trend, getTrendColor)}
    </div>
  )
}

const stepButton =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-primary-text transition-colors hover:bg-quaternary-bg disabled:cursor-not-allowed disabled:opacity-40'

interface TradeItemCardProps {
  draft: TradeItemDraft
  item: Item | undefined
  onAddOne?: () => void
  onRemoveOne: () => void
  onRemoveAll: () => void
  onCondition: (next: Condition) => void
}

/** One item (all copies of it in one condition) with a quantity stepper. */
export function TradeItemCard({
  draft,
  item,
  onAddOne,
  onRemoveOne,
  onRemoveAll,
  onCondition
}: TradeItemCardProps): React.JSX.Element {
  const isCustom = isCustomTradeItemId(draft.id)
  const condition = conditionOf(draft)
  const unit = draft.duped ? draft.dupedValue : draft.cashValue
  const notes = item?.notes

  return (
    <div className="flex flex-col rounded-xl border border-border-card bg-tertiary-bg/50 p-2.5">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-tertiary-bg">
        <img
          src={isCustom ? getCustomTradeTypeIconUrl(draft.id.replace(' ', '_')) : getItemImagePath(draft.type, draft.name)}
          alt=""
          onError={handleImageError}
          draggable={false}
          className={`h-full w-full ${isCustom ? 'object-contain p-4' : 'object-cover'}`}
        />
        {draft.duped && (
          <span className="absolute top-1 left-1 z-10 inline-flex h-5 items-center rounded-md bg-status-error/90 px-2 text-[10px] leading-none font-semibold text-form-button-text">
            Duped
          </span>
        )}
        {!isCustom && (
          <>
            <UnlockBadges season={item?.season} level={item?.level} />
            <div className="pointer-events-none absolute top-1 right-1 z-10">
              <CategoryIconBadge
                type={draft.type}
                isLimited={item?.is_limited === 1}
                isSeasonal={item?.is_seasonal === 1}
                className="h-4 w-4"
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-2 flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-1">
          <p className="min-w-0 truncate text-xs font-semibold text-primary-text" title={draft.name}>
            {draft.name}
          </p>
          {known(notes) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Read note for ${draft.name}`}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border-card bg-secondary-bg text-secondary-text hover:text-primary-text"
                >
                  <Icon d={INFO} className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-h-64 max-w-72 overflow-y-auto whitespace-pre-wrap">{notes}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {!isCustom && (
          <div className="flex flex-wrap items-center justify-between gap-1">
            <p className="text-sm font-bold text-primary-text tabular-nums">
              {parseCashValue(unit ?? null) > 0 ? formatFullValue(unit ?? null) : 'N/A'}
              {draft.amount > 1 && <span className="ml-1 text-[10px] font-semibold text-secondary-text">×{draft.amount}</span>}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Condition: ${CONDITION_LABELS[condition]}`}
                  className={`inline-flex h-5 items-center gap-0.5 rounded-md px-2 text-[10px] leading-none font-semibold transition-opacity hover:opacity-90 ${CONDITION_STYLES[condition]}`}
                >
                  {CONDITION_LABELS[condition]}
                  <Icon d={CHEVRON} className="h-2.5 w-2.5 opacity-80" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={condition} onValueChange={(value) => onCondition(value as Condition)}>
                  <DropdownMenuRadioItem value="clean">Clean</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="duped">Duped</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="og">OG</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-full border border-border-card">
            <button
              type="button"
              onClick={onRemoveOne}
              className={stepButton}
              aria-label={draft.amount > 1 ? `Remove one ${draft.name}` : `Remove ${draft.name}`}
            >
              <Icon d={MINUS} className="h-4 w-4" />
            </button>
            <span className="min-w-5 text-center text-xs font-bold text-primary-text tabular-nums">{draft.amount}</span>
            <button
              type="button"
              onClick={onAddOne}
              disabled={!onAddOne}
              className={stepButton}
              aria-label={`Add another ${draft.name}`}
            >
              <Icon d={PLUS} className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onRemoveAll}
            aria-label={`Remove all ${draft.amount} ${draft.name}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-button-danger transition-colors hover:bg-button-danger/10"
          >
            <Icon d={TRASH} className="h-4 w-4" />
          </button>
        </div>

        {!isCustom && <MarketDetails item={item} duped={draft.duped} />}
      </div>
    </div>
  )
}

function TradeSideHeading({ side, count, total, label }: { side: TradeSide; count: number; total: number; label: string }): React.JSX.Element {
  const giving = side === 'offering'
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span
        aria-hidden="true"
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${giving ? 'bg-button-info text-form-button-text' : 'bg-button-secondary text-primary-text'}`}
      >
        <Icon d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" className={`h-4 w-4 ${giving ? '' : 'rotate-180'}`} />
      </span>
      <h3 className="text-xs font-semibold tracking-wide text-primary-text uppercase">{label}</h3>
      <span className="text-xs text-secondary-text">{`· ${count} ${count === 1 ? 'item' : 'items'}`}</span>
      {total > 0 && <span className="text-sm font-bold text-primary-text tabular-nums">{total.toLocaleString()}</span>}
    </div>
  )
}

interface TradeSidePanelProps {
  side: TradeSide
  drafts: TradeItemDraft[]
  /** Defaults to "You give" / "You receive". */
  label?: string
  max?: number
  onAddOne: (draft: TradeItemDraft) => void
  onRemoveOne: (draft: TradeItemDraft) => void
  onRemoveAll: (draft: TradeItemDraft) => void
  onCondition: (draft: TradeItemDraft, next: Condition) => void
  onMirror?: () => void
  /** The dashed "Add item" card: points the user at the item picker. */
  onAddClick: () => void
}

/** One side of a trade: heading with its total, item cards, and an "Add item" card. */
export function TradeSidePanel({
  side,
  drafts,
  label,
  max = Infinity,
  onAddOne,
  onRemoveOne,
  onRemoveAll,
  onCondition,
  onMirror,
  onAddClick
}: TradeSidePanelProps): React.JSX.Element {
  const { items } = useItems()
  const byId = useMemo(() => new Map(items.map((item) => [String(item.id), item])), [items])
  const giving = side === 'offering'
  const count = totalCount(drafts)
  const atCap = count >= max
  const dashed = giving
    ? 'border-status-success/30 hover:border-status-success/60'
    : 'border-button-danger/30 hover:border-button-danger/60'
  const otherSide = giving ? 'You receive' : 'You give'

  return (
    <section
      className={`flex min-w-0 flex-col rounded-2xl border bg-secondary-bg p-4 ${giving ? 'border-status-success' : 'border-button-danger'}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <TradeSideHeading side={side} count={count} total={sideValue(drafts)} label={label ?? (giving ? 'You give' : 'You receive')} />
        {onMirror && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" size="sm" onClick={onMirror} disabled={drafts.length === 0}>
                <Icon d={SWAP} className="h-3.5 w-3.5" />
                Mirror
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mirror to {otherSide}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="max-h-120 overflow-y-auto pr-1">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3">
          {drafts.map((draft) => {
            const item = byId.get(draft.id)
            return (
              <TradeItemCard
                key={`${draft.id}:${draft.duped}:${draft.og}`}
                draft={draft}
                item={item}
                onAddOne={atCap ? undefined : () => onAddOne(draft)}
                onRemoveOne={() => onRemoveOne(draft)}
                onRemoveAll={() => onRemoveAll(draft)}
                onCondition={(next) => onCondition(draft, next)}
              />
            )
          })}
          {!atCap && (
            <button
              type="button"
              onClick={onAddClick}
              aria-label={drafts.length === 0 ? 'Add item' : 'Add another item'}
              className={`flex min-h-54 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed bg-tertiary-bg p-3 text-center transition-colors ${dashed} ${drafts.length === 0 ? 'col-span-full' : ''}`}
            >
              <Icon d={PLUS} className="h-5 w-5 text-primary-text" />
              <span className="text-xs font-medium text-primary-text">{drafts.length === 0 ? 'No items selected' : 'Add item'}</span>
              {drafts.length === 0 && <span className="text-xs text-secondary-text">Pick an item below to add it</span>}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

