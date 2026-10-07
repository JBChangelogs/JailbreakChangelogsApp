import { formatFullValue, getItemImagePath, handleImageError } from '@renderer/lib/itemValueUtils'
import { getCustomTradeTypeIconUrl, isCustomTradeItemId } from '@shared/trading'
import { MAX_ITEMS_PER_SIDE, sideValue, totalCount, type TradeItemDraft, type TradeItemDraftKey } from '@renderer/lib/tradeItemDraft'
import type { TradeSide } from '@renderer/hooks/useTradeComposer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'

function MoreIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  )
}

function SwapIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v13m0 0-3-3m3 3 3-3m7-11v13m0-13 3 3m-3-3-3 3" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16M9 7V4h6v3m-8 0 .867 12.142A2 2 0 0 0 9.862 21h4.276a2 2 0 0 0 1.995-1.858L17 7"
      />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

function conditionOf(item: TradeItemDraft): 'clean' | 'duped' | 'og' {
  return item.duped ? 'duped' : item.og ? 'og' : 'clean'
}

export function TradeSideList({
  title,
  side,
  items,
  onRemove,
  onSetCondition,
  onMove,
  max = MAX_ITEMS_PER_SIDE,
  headerAction
}: {
  title: string
  side: TradeSide
  items: TradeItemDraft[]
  onRemove: (key: TradeItemDraftKey, amount: number) => void
  onSetCondition: (key: TradeItemDraftKey, next: { duped: boolean; og: boolean }) => void
  onMove: (key: TradeItemDraftKey) => void
  max?: number
  headerAction?: React.ReactNode
}): React.JSX.Element {
  const otherSideLabel = side === 'offering' ? 'Requesting' : 'Offering'
  const count = totalCount(items)
  const totalValue = sideValue(items)

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border-card bg-secondary-bg">
      <div className="flex shrink-0 items-center justify-between border-b border-border-primary px-3 py-2">
        <h3 className="text-xs font-bold tracking-wide text-quaternary-text uppercase">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-tertiary-text">
            {Number.isFinite(max) ? `${count}/${max}` : count}
            {totalValue > 0 && ` · ${formatFullValue(String(totalValue))}`}
          </span>
          {headerAction}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {items.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-quaternary-text">No items added yet.</p>
        )}
        {items.map((item) => {
          const isCustom = isCustomTradeItemId(item.id)
          const key: TradeItemDraftKey = { id: item.id, duped: item.duped, og: item.og }
          return (
            <div
              key={`${item.id}:${item.duped}:${item.og}`}
              className="flex items-center gap-2 rounded-md bg-tertiary-bg p-1.5"
            >
              <img
                src={isCustom ? getCustomTradeTypeIconUrl(item.id.replace(' ', '_')) : getItemImagePath(item.type, item.name)}
                alt=""
                onError={handleImageError}
                className="h-8 w-8 shrink-0 rounded object-cover"
                draggable={false}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-primary-text">
                  {item.name}
                  {item.amount > 1 && <span className="text-quaternary-text"> ×{item.amount}</span>}
                </p>
                {!isCustom && (
                  <p className="truncate text-[10px] text-secondary-text">
                    {formatFullValue(item.duped ? item.dupedValue ?? null : item.cashValue ?? null)}
                    {item.duped && ' · Duped'}
                    {item.og && ' · OG'}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label={item.amount > 1 ? `Remove one ${item.name}` : `Remove ${item.name}`}
                title={item.amount > 1 ? 'Remove one' : 'Remove'}
                onClick={() => onRemove(key, 1)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-tertiary-text transition-colors hover:bg-quaternary-bg hover:text-status-error"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${item.name} options`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-tertiary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
                  >
                    <MoreIcon className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!isCustom && (
                    <>
                      <DropdownMenuRadioGroup
                        value={conditionOf(item)}
                        onValueChange={(value) => {
                          const next =
                            value === 'duped'
                              ? { duped: true, og: false }
                              : value === 'og'
                                ? { duped: false, og: true }
                                : { duped: false, og: false }
                          onSetCondition(key, next)
                        }}
                      >
                        <DropdownMenuRadioItem value="clean">Clean</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="duped">Duped</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="og">OG</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => onMove(key)}>
                    <SwapIcon className="h-4 w-4" />
                    Move to {otherSideLabel}
                  </DropdownMenuItem>
                  {item.amount > 1 ? (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="text-status-error focus:bg-status-error/10 data-[state=open]:bg-status-error/10">
                        <TrashIcon className="h-4 w-4" />
                        Remove
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="p-2">
                        <p className="mb-1.5 px-0.5 text-[11px] font-medium text-tertiary-text">Remove how many?</p>
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: item.amount }, (_, i) => i + 1).map((n) => (
                            <DropdownMenuItem
                              key={n}
                              destructive
                              onClick={() => onRemove(key, n)}
                              className="h-7 min-w-7 justify-center rounded-md border border-border-card px-2 py-0 text-xs font-semibold"
                            >
                              {n === item.amount ? 'All' : n}
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  ) : (
                    <DropdownMenuItem destructive onClick={() => onRemove(key, 1)}>
                      <TrashIcon className="h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })}
      </div>
    </div>
  )
}
