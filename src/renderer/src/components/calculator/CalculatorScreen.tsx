import { useEffect, useMemo, useRef, useState } from 'react'
import { useCalculator } from '@renderer/contexts/CalculatorContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { useItems } from '@renderer/hooks/useItems'
import type { TradeSide } from '@renderer/hooks/useTradeComposer'
import { Button } from '@renderer/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { filterAndSortItems } from '@renderer/lib/itemBrowse'
import { formatFullValue } from '@renderer/lib/itemValueUtils'
import { robloxInventoryApi, type UserInventoryItem } from '@renderer/lib/robloxInventoryApi'
import { totalCount } from '@renderer/lib/tradeItemDraft'
import type { Item } from '@shared/item'
import { BrowseItemCard, SelectedItemCard, conditionFlags, type Condition } from './ItemCards'
import { ScanControls } from './ScanControls'

function SvgIcon({ d, className }: { d: string; className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const SWAP_PATH = 'M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4'
const TRASH_PATH = 'M4 7h16M9 7V4h6v3m-8 0 .867 12.142A2 2 0 0 0 9.862 21h4.276a2 2 0 0 0 1.995-1.858L17 7'
const MIRROR_PATH = 'M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5'

const format = (n: number): string => (n === 0 ? '0' : formatFullValue(String(n)))

function SummaryBar(): React.JSX.Element {
  const { composer, offeringTotal, requestingTotal } = useCalculator()
  const { offering, requesting, setSides } = composer
  const [clearOpen, setClearOpen] = useState(false)

  const offeringCount = totalCount(offering)
  const requestingCount = totalCount(requesting)
  const hasItems = offeringCount > 0 || requestingCount > 0
  const difference = offeringTotal - requestingTotal
  const combined = offeringTotal + requestingTotal
  const offeringShare = combined > 0 ? (offeringTotal / combined) * 100 : 50

  // From the trader's side: giving away more than you get is the bad outcome.
  const netLabel =
    difference === 0
      ? 'Even trade'
      : difference > 0
        ? `You're giving ${format(difference)} more`
        : `You're getting ${format(-difference)} more`
  const netClass =
    difference === 0
      ? 'border-border-card bg-tertiary-bg text-primary-text'
      : difference > 0
        ? 'border-status-error bg-status-error text-form-button-text'
        : 'border-status-success bg-status-success text-form-button-text'

  const clear = (which: 'offering' | 'requesting' | 'both'): void => {
    setSides(
      which === 'offering' || which === 'both' ? [] : offering,
      which === 'requesting' || which === 'both' ? [] : requesting
    )
    setClearOpen(false)
  }

  return (
    <div className="rounded-lg border border-border-card bg-secondary-bg px-4 pt-3 pb-2.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium tracking-wide text-status-success uppercase">
            Offering <span className="text-secondary-text normal-case">({offeringCount})</span>
          </p>
          <p className="truncate text-base font-bold text-primary-text tabular-nums">{format(offeringTotal)}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-md border px-2.5 py-1 text-xs font-bold tabular-nums ${netClass}`}
        >
          {netLabel}
        </span>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-[10px] font-medium tracking-wide text-status-error uppercase">
            Requesting <span className="text-secondary-text normal-case">({requestingCount})</span>
          </p>
          <p className="truncate text-base font-bold text-primary-text tabular-nums">{format(requestingTotal)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 border-l border-border-card pl-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Swap sides"
                disabled={!hasItems}
                onClick={() => setSides(requesting, offering)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text disabled:pointer-events-none disabled:opacity-40"
              >
                <SvgIcon d={SWAP_PATH} className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Swap sides</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Clear"
                disabled={!hasItems}
                onClick={(e) => (e.shiftKey ? clear('both') : setClearOpen(true))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-status-error/15 hover:text-status-error disabled:pointer-events-none disabled:opacity-40"
              >
                <SvgIcon d={TRASH_PATH} className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Clear (hold Shift to clear both sides)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="mt-2 flex h-1 w-full overflow-hidden rounded-full bg-tertiary-bg">
        {hasItems && (
          <>
            <div className="h-full bg-status-error transition-all duration-300" style={{ width: `${offeringShare}%` }} />
            <div
              className="h-full bg-status-success transition-all duration-300"
              style={{ width: `${100 - offeringShare}%` }}
            />
          </>
        )}
      </div>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear calculator?</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4 text-sm text-secondary-text">Choose which side to clear.</div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border-primary px-5 py-4">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={offeringCount === 0}
              onClick={() => clear('offering')}
            >
              Offering
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={requestingCount === 0}
              onClick={() => clear('requesting')}
            >
              Requesting
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => clear('both')}>
              Both
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SidePanel({ side, items }: { side: TradeSide; items: Item[] }): React.JSX.Element {
  const { composer, offeringTotal, requestingTotal } = useCalculator()
  const isOffering = side === 'offering'
  const drafts = isOffering ? composer.offering : composer.requesting
  const total = isOffering ? offeringTotal : requestingTotal
  const byId = useMemo(() => new Map(items.map((item) => [String(item.id), item])), [items])

  return (
    <section
      className={`flex min-w-0 flex-col rounded-lg border bg-secondary-bg p-3 ${
        isOffering ? 'border-status-success' : 'border-status-error'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3
            className={`text-xs font-medium tracking-wide uppercase ${isOffering ? 'text-status-success' : 'text-status-error'}`}
          >
            {isOffering ? 'Offering' : 'Requesting'}
          </h3>
          <span className="text-sm text-secondary-text">({totalCount(drafts)})</span>
          {total > 0 && <span className="truncate text-sm font-semibold text-primary-text">{format(total)}</span>}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={drafts.length === 0}
              onClick={() => composer.setSides(drafts, drafts)}
            >
              <SvgIcon d={MIRROR_PATH} className="h-3.5 w-3.5" />
              Mirror
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy to {isOffering ? 'Requesting' : 'Offering'}</TooltipContent>
        </Tooltip>
      </div>
      {drafts.length === 0 ? (
        <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border-card p-3 text-center">
          <span className="text-xs font-medium text-secondary-text">No items selected</span>
          <span className="text-xs text-tertiary-text">
            Use {isOffering ? 'Offer' : 'Request'} on an item below, or scan a trade
          </span>
        </div>
      ) : (
        <div className="flex max-h-120 flex-col gap-1.5 overflow-y-auto pr-1">
          {drafts.map((draft) => {
            const key = { id: draft.id, duped: draft.duped, og: draft.og }
            const live = byId.get(draft.id)
            return (
              <SelectedItemCard
                key={`${draft.id}:${draft.duped}:${draft.og}`}
                draft={draft}
                item={live}
                onRemoveOne={() => composer.removeAmount(side, key, 1)}
                onAddOne={() => live && composer.addItem(side, live, draft.duped, draft.og)}
                onCondition={(next) => composer.setCondition(side, key, conditionFlags(next))}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

const PAGE_SIZE = 60

interface BrowseRow {
  item: Item
  key: string
  condition?: Condition
}

function BrowseGrid({ items }: { items: Item[] }): React.JSX.Element {
  const { composer, browse } = useCalculator()
  const { user } = useCurrentUser()
  const robloxId = user?.roblox?.roblox_id
  const [inventory, setInventory] = useState<UserInventoryItem[] | null>(null)
  const [inventoryError, setInventoryError] = useState<string | null>(null)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const inventoryMode = browse.source === 'inventory' && !!robloxId

  useEffect(() => {
    if (!inventoryMode || inventory !== null || !robloxId) return
    robloxInventoryApi
      .fetchUserInventory(robloxId)
      .then((res) => setInventory(res.items))
      .catch((err: unknown) => setInventoryError(err instanceof Error ? err.message : 'Failed to load inventory'))
  }, [inventoryMode, inventory, robloxId])

  const { search, types, demand, trend, sort } = browse
  const rows = useMemo<BrowseRow[]>(() => {
    const filtered = filterAndSortItems(items, { search, types, demand, trend, sort })
    if (!inventoryMode) return filtered.map((item) => ({ item, key: String(item.id) }))
    if (!inventory) return []
    const order = new Map(filtered.map((item, i) => [item.id, i]))
    return inventory
      .filter((row) => order.has(row.itemId))
      .sort((a, b) => order.get(a.itemId)! - order.get(b.itemId)!)
      .map((row) => ({
        item: filtered[order.get(row.itemId)!],
        key: `${row.itemId}:${row.duped}:${row.og}`,
        condition: row.duped ? 'duped' : row.og ? 'og' : 'clean'
      }))
  }, [items, search, types, demand, trend, sort, inventoryMode, inventory])

  useEffect(() => setVisible(PAGE_SIZE), [rows])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisible((v) => Math.min(v + PAGE_SIZE, rows.length))
      },
      { rootMargin: '600px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [rows.length, visible])

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-primary-text">
        {inventoryMode ? 'Browse Inventory Items' : 'Browse Items'}
        <span className="ml-2 text-sm font-normal text-tertiary-text">{rows.length}</span>
      </h2>
      {inventoryMode && !inventory && !inventoryError && (
        <p className="py-6 text-center text-xs text-quaternary-text">Loading inventory…</p>
      )}
      {inventoryError && <p className="py-6 text-center text-xs text-form-error">{inventoryError}</p>}
      {rows.length === 0 && (!inventoryMode || inventory) && (
        <p className="py-6 text-center text-xs text-quaternary-text">No items match your filters.</p>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
        {rows.slice(0, visible).map((row) => (
          <BrowseItemCard
            key={row.key}
            item={row.item}
            fixedCondition={row.condition}
            onAdd={(side, condition) => {
              const { duped, og } = conditionFlags(condition)
              composer.addItem(side, row.item, duped, og)
            }}
          />
        ))}
      </div>
      {visible < rows.length && <div ref={sentinelRef} className="h-px" />}
    </section>
  )
}

export function CalculatorScreen(): React.JSX.Element {
  const { items } = useItems()

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
      <div className="flex items-center justify-between border-b border-border-primary px-5 py-4">
        <h2 className="text-sm font-semibold text-primary-text">Value Calculator</h2>
        <ScanControls />
      </div>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-4">
          <SidePanel side="offering" items={items} />
          <SidePanel side="requesting" items={items} />
        </div>
        <SummaryBar />
        <BrowseGrid items={items} />
      </div>
    </div>
  )
}
