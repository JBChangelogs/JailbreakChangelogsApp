import { useEffect, useMemo, useRef, useState } from 'react'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { useItems } from '@renderer/hooks/useItems'
import { robloxInventoryApi, type UserInventoryItem } from '@renderer/lib/robloxInventoryApi'
import { getCategoryColor } from '@renderer/lib/categoryIcons'
import {
  formatFullValue,
  getDemandColor,
  getItemImagePath,
  handleImageError,
  ITEM_TYPE_FILTERS,
  sortByCashValue,
  type ItemTypeFilter
} from '@renderer/lib/itemValueUtils'
import { CUSTOM_TRADE_TYPES, getCustomTradeTypeIconUrl } from '@shared/trading'
import { SearchInput } from '@renderer/components/ui/search-input'
import { FilterMenu } from '@renderer/components/tracker/FilterMenus'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import type { Item } from '@shared/item'
import type { TradeSide } from '@renderer/hooks/useTradeComposer'
import { track, useSearchTracking } from '@renderer/lib/analytics'

type TypeFilterValue = 'all' | ItemTypeFilter
type Condition = 'clean' | 'duped' | 'og'
type Source = 'catalog' | 'inventory'

const CONDITION_OPTIONS: readonly { value: Condition; label: string }[] = [
  { value: 'clean', label: 'Clean' },
  { value: 'duped', label: 'Duped' },
  { value: 'og', label: 'OG' }
]

const TYPE_OPTIONS: readonly { value: TypeFilterValue; label: string }[] = [
  { value: 'all', label: 'All Types' },
  ...ITEM_TYPE_FILTERS.map((f) => ({ value: f.value as TypeFilterValue, label: f.label }))
]

function PlusIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

interface TradeItemPickerProps {
  side: TradeSide
  onSide: (side: TradeSide) => void
  onAddItem: (item: Item, duped: boolean, og: boolean, side: TradeSide) => void
  onAddCustomType: (customId: string, side: TradeSide) => void
  atCap: boolean
}

const PAGE_SIZE = 60

export function TradeItemPicker({ side, onSide, onAddItem, onAddCustomType, atCap }: TradeItemPickerProps): React.JSX.Element {
  const { user } = useCurrentUser()
  const { items, loading } = useItems()
  const [condition, setCondition] = useState<Condition>('clean')
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>('all')
  const [search, setSearch] = useState('')
  const [source, setSource] = useState<Source>('catalog')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const robloxId = user?.roblox?.roblox_id
  const [inventory, setInventory] = useState<UserInventoryItem[] | null>(null)
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventoryError, setInventoryError] = useState<string | null>(null)

  const handleUseInventory = (): void => {
    setSource('inventory')
    if (inventory !== null || inventoryLoading || !robloxId) return
    setInventoryLoading(true)
    setInventoryError(null)
    robloxInventoryApi
      .fetchUserInventory(robloxId)
      .then((res) => setInventory(res.items))
      .catch((err: unknown) => setInventoryError(err instanceof Error ? err.message : 'Failed to load inventory'))
      .finally(() => setInventoryLoading(false))
  }

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])

  const catalogItems = useMemo(() => {
    let result = items
    if (typeFilter !== 'all') {
      const wanted = ITEM_TYPE_FILTERS.find((f) => f.value === typeFilter)?.type
      if (wanted) result = result.filter((item) => item.type.toLowerCase() === wanted)
    }
    if (search.trim()) {
      const query = search.trim().toLowerCase()
      result = result.filter((item) => item.name.toLowerCase().includes(query))
    }
    return result.slice().sort((a, b) => sortByCashValue(a.cash_value, b.cash_value, 'desc'))
  }, [items, typeFilter, search])

  const inventoryRows = useMemo(() => {
    if (!inventory) return []
    let rows = inventory
      .map((row) => ({ row, item: itemById.get(row.itemId) }))
      .filter((r): r is { row: UserInventoryItem; item: Item } => Boolean(r.item))
    if (typeFilter !== 'all') {
      const wanted = ITEM_TYPE_FILTERS.find((f) => f.value === typeFilter)?.type
      if (wanted) rows = rows.filter((r) => r.item.type.toLowerCase() === wanted)
    }
    if (search.trim()) {
      const query = search.trim().toLowerCase()
      rows = rows.filter((r) => r.item.name.toLowerCase().includes(query))
    }
    return rows
  }, [inventory, itemById, typeFilter, search])

  const activeCount = source === 'catalog' ? catalogItems.length : inventoryRows.length

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [catalogItems, inventoryRows, source])

  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = scrollRef.current
    if (!sentinel || !root) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, activeCount))
        }
      },
      { root, rootMargin: '600px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [activeCount])

  const hasMore = visibleCount < activeCount

  useSearchTracking('trade_picker', search, activeCount)

  // Ctrl/Cmd+click adds to requesting, Shift+click to offering, plain click to the selected side.
  const sideFor = (e: React.MouseEvent, from: Source | 'custom'): TradeSide => {
    const method = e.ctrlKey || e.metaKey ? 'ctrl' : e.shiftKey ? 'shift' : 'click'
    const target = method === 'ctrl' ? 'requesting' : method === 'shift' ? 'offering' : side
    track('trade_item_add', { side: target, method, source: from })
    return target
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border-primary px-5 py-4">
        <h2 className="text-sm font-semibold text-primary-text">Trade Ads</h2>
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-b border-border-primary p-3">
        <p className="rounded-xl border border-border-card bg-secondary-bg px-3 py-2 text-xs text-secondary-text">
          Tip: <Kbd>Shift</Kbd> + click to add to Offering, <Kbd>Ctrl</Kbd> + click to add to Requesting.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-2xl border border-border-card bg-secondary-bg p-1">
            {(['offering', 'requesting'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSide(s)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${side === s ? 'bg-button-info text-form-button-text' : 'text-secondary-text hover:text-primary-text'
                  }`}
              >
                Add to {s === 'offering' ? 'Offering' : 'Requesting'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 rounded-2xl border border-border-card bg-secondary-bg p-1">
            {CONDITION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCondition(opt.value)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${condition === opt.value ? 'bg-quaternary-bg text-primary-text' : 'text-secondary-text hover:text-primary-text'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {robloxId && (
            <div className="flex items-center gap-1.5 rounded-2xl border border-border-card bg-secondary-bg p-1">
              <button
                type="button"
                onClick={() => setSource('catalog')}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${source === 'catalog' ? 'bg-quaternary-bg text-primary-text' : 'text-secondary-text hover:text-primary-text'
                  }`}
              >
                Values List
              </button>
              <button
                type="button"
                onClick={handleUseInventory}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${source === 'inventory' ? 'bg-quaternary-bg text-primary-text' : 'text-secondary-text hover:text-primary-text'
                  }`}
              >
                My Inventory
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search items..." className="flex-1" />
          <div className="w-44 shrink-0">
            <FilterMenu<TypeFilterValue>
              label="Type"
              value={typeFilter}
              options={TYPE_OPTIONS}
              onChange={setTypeFilter}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CUSTOM_TRADE_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={(e) => onAddCustomType(type.id, sideFor(e, 'custom'))}
              className={`flex items-center gap-1.5 rounded-full border border-border-card bg-tertiary-bg py-1 pr-2.5 pl-1 text-[11px] font-medium text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text ${atCap ? 'opacity-40' : ''}`}
            >
              <img
                src={getCustomTradeTypeIconUrl(type.icon)}
                alt=""
                onError={handleImageError}
                className="h-5 w-5 shrink-0 rounded-full object-cover"
                draggable={false}
              />
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-2">
        {source === 'catalog' ? (
          <>
            {loading && <p className="p-3 text-center text-xs text-quaternary-text">Loading items…</p>}
            <div className="grid grid-cols-2 gap-2">
              {catalogItems.slice(0, visibleCount).map((item) => (
                <PickerCard
                  key={item.id}
                  item={item}
                  disabled={atCap}
                  duped={condition === 'duped'}
                  onAdd={(e) => onAddItem(item, condition === 'duped', condition === 'og', sideFor(e, 'catalog'))}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {inventoryLoading && <p className="p-3 text-center text-xs text-quaternary-text">Loading inventory…</p>}
            {inventoryError && <p className="p-3 text-center text-xs text-form-error">{inventoryError}</p>}
            {!inventoryLoading && !inventoryError && inventoryRows.length === 0 && (
              <p className="p-3 text-center text-xs text-quaternary-text">No matching inventory items found.</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {inventoryRows.slice(0, visibleCount).map(({ row, item }) => (
                <PickerCard
                  key={`${row.itemId}-${row.duped}`}
                  item={item}
                  disabled={atCap}
                  duped={row.duped}
                  badge={row.duped ? 'Duped' : row.og ? 'OG' : undefined}
                  onAdd={(e) => onAddItem(item, row.duped, row.og, sideFor(e, 'inventory'))}
                />
              ))}
            </div>
          </>
        )}
        {hasMore && <div ref={sentinelRef} className="h-px" />}
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <kbd className="rounded-md border border-border-card bg-tertiary-bg px-1.5 py-0.5 font-sans text-[10px] font-semibold text-primary-text">
      {children}
    </kbd>
  )
}

function PickerCard({
  item,
  disabled,
  duped,
  badge,
  onAdd
}: {
  item: Item
  disabled: boolean
  duped: boolean
  badge?: string
  onAdd: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const value = duped ? item.duped_value : item.cash_value
  const demandLabel = duped
    ? !item.duped_demand || item.duped_demand === 'N/A'
      ? 'N/A'
      : item.duped_demand
    : item.demand === 'N/A'
      ? 'Unknown'
      : item.demand

  return (
    <div className="flex gap-2.5 rounded-2xl border border-border-card bg-tertiary-bg p-2.5">
      <img
        src={getItemImagePath(item.type, item.name)}
        alt=""
        onError={handleImageError}
        className="h-14 w-14 shrink-0 rounded-lg object-cover"
        draggable={false}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-1.5">
          <p className="min-w-0 truncate text-xs font-semibold text-primary-text">{item.name}</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onAdd}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text ${disabled ? 'opacity-40' : ''}`}
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Add</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <span
            className="inline-flex h-5 items-center rounded-lg border bg-tertiary-bg/40 px-1.5 text-[9px] font-medium text-primary-text"
            style={{ borderColor: getCategoryColor(item.type) }}
          >
            {item.type}
          </span>
          {item.tradable === 0 && (
            <span className="inline-flex h-5 items-center rounded-lg border border-border-card px-1.5 text-[9px] font-medium text-secondary-text">
              Non-Tradable
            </span>
          )}
          {badge && (
            <span className="inline-flex h-5 items-center rounded-lg border border-border-card px-1.5 text-[9px] font-medium text-secondary-text">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-primary-text">{formatFullValue(value)}</span>
          <span
            className={`inline-flex h-5 items-center rounded-lg px-1.5 text-[9px] leading-none font-bold ${getDemandColor(demandLabel)}`}
          >
            {demandLabel}
          </span>
        </div>
      </div>
    </div>
  )
}
