import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useItems } from '@renderer/hooks/useItems'
import { useTradeComposer, type TradeSide } from '@renderer/hooks/useTradeComposer'
import { addItemToSide, sideValue, type TradeItemDraft } from '@renderer/lib/tradeItemDraft'
import { parseTradeScan, SCAN_TUNING, type ScannedItem, type ScanResponse } from '@shared/tradeScan'
import type { Item } from '@shared/item'
import type { ItemBrowseFilters } from '@renderer/lib/itemBrowse'
import type { ValueSort } from '@renderer/lib/itemValueUtils'

const STORAGE_KEY = 'calculatorItems'

type Composer = ReturnType<typeof useTradeComposer>
type ScanSuccess = Extract<ScanResponse, { ok: true }>
type Sides = { offering: TradeItemDraft[]; requesting: TradeItemDraft[] }

interface CalculatorContextValue {
  composer: Composer
  activeSide: TradeSide
  setActiveSide: (side: TradeSide) => void
  offeringTotal: number
  requestingTotal: number
  // Parses a scan and fills both sides. Returns false if no items were found.
  applyScan: (response: ScanSuccess) => boolean
  browse: BrowseState
}

export type BrowseSource = 'catalog' | 'inventory'

export interface BrowseState extends ItemBrowseFilters {
  source: BrowseSource
  setSource: (source: BrowseSource) => void
  setSearch: (search: string) => void
  setSort: (sort: ValueSort) => void
  toggleType: (type: string) => void
  toggleDemand: (demand: string) => void
  toggleTrend: (trend: string) => void
  clearFilters: () => void
}

function useToggleSet(): [Set<string>, (value: string) => void, () => void] {
  const [set, setSet] = useState<Set<string>>(new Set())
  const toggle = (value: string): void =>
    setSet((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  return [set, toggle, () => setSet(new Set())]
}

function useBrowseState(): BrowseState {
  const [source, setSource] = useState<BrowseSource>('catalog')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<ValueSort>('cash-desc')
  const [types, toggleType, clearTypes] = useToggleSet()
  const [demand, toggleDemand, clearDemand] = useToggleSet()
  const [trend, toggleTrend, clearTrend] = useToggleSet()
  return {
    source,
    setSource,
    search,
    setSearch,
    sort,
    setSort,
    types,
    toggleType,
    demand,
    toggleDemand,
    trend,
    toggleTrend,
    clearFilters: () => {
      clearTypes()
      clearDemand()
      clearTrend()
    }
  }
}

const CalculatorContext = createContext<CalculatorContextValue | null>(null)

function load(): Partial<Sides> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function toSides(response: ScanSuccess, items: Item[]): Sides & { inTradeMenu: boolean; withinLimit: boolean } {
  const result = parseTradeScan(response.detections, response.height, items)
  const { maxItemsPerSide } = SCAN_TUNING
  const byId = new Map(items.map((item) => [item.id, item]))
  const toDrafts = (scanned: ScannedItem[]): TradeItemDraft[] =>
    scanned.reduce<TradeItemDraft[]>((drafts, s) => {
      const item = byId.get(s.id)
      return item ? addItemToSide(drafts, item, false, false, Infinity) : drafts
    }, [])
  return {
    offering: toDrafts(result.offering),
    requesting: toDrafts(result.requesting),
    inTradeMenu: result.inTradeMenu,
    withinLimit: result.offering.length <= maxItemsPerSide && result.requesting.length <= maxItemsPerSide
  }
}

// How long the trade menu must be gone before auto scan clears what it filled.
const LEAVE_AFTER_MS = 1500

const draftKey = (d: TradeItemDraft): string => `${d.id}:${d.duped}:${d.og}`

// Order-independent, so a re-ordered read of the same trade isn't treated as a change.
const signature = (sides: Sides): string =>
  JSON.stringify([sides.offering, sides.requesting].map((side) => side.map((d) => `${draftKey(d)}x${d.amount}`).sort()))

// Keep items that are still in the trade where they are (updating their amount), drop removed ones, append new ones.
function mergeInPlace(current: TradeItemDraft[], scanned: TradeItemDraft[]): TradeItemDraft[] {
  const scannedByKey = new Map(scanned.map((d) => [draftKey(d), d]))
  const kept = current.flatMap((d) => {
    const match = scannedByKey.get(draftKey(d))
    return match ? [{ ...d, amount: match.amount }] : []
  })
  const keptKeys = new Set(kept.map(draftKey))
  return [...kept, ...scanned.filter((d) => !keptKeys.has(draftKey(d)))]
}

// Mounted for the whole home screen, so auto scan works from any tab and the calculator keeps its items.
export function CalculatorProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [initial] = useState(load)
  // The calculator has no per-side cap, unlike trade ads.
  const composer = useTradeComposer(initial, Infinity)
  const [activeSide, setActiveSide] = useState<TradeSide>('offering')
  const browse = useBrowseState()
  const { items } = useItems()
  const { offering, requesting, setSides } = composer

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ offering, requesting }))
    } catch {}
  }, [offering, requesting])

  // Saved items keep the values they were added with; refresh them once the live item list loads.
  useEffect(() => {
    if (items.length === 0) return
    const byId = new Map(items.map((item) => [String(item.id), item]))
    const refresh = (side: TradeItemDraft[]): TradeItemDraft[] =>
      side.map((d) => {
        const live = byId.get(d.id)
        return live ? { ...d, cashValue: live.cash_value, dupedValue: live.duped_value } : d
      })
    setSides(refresh(offering), refresh(requesting))
    // Only on item list load, not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const applyScan = (response: ScanSuccess): boolean => {
    const sides = toSides(response, items)
    if (sides.offering.length === 0 && sides.requesting.length === 0) return false
    setSides(sides.offering, sides.requesting)
    return true
  }

  // Auto scan mirrors the open trade live, and clears what it filled once the trade menu closes.
  const latest = useRef({ items, setSides, offering, requesting })
  latest.current = { items, setSides, offering, requesting }
  useEffect(() => {
    let lastSignature: string | null = null
    let leftMenuAt: number | null = null
    return window.api.scanner.onAutoResult((response) => {
      if (!response.ok) return
      const sides = toSides(response, latest.current.items)
      if (!sides.inTradeMenu) {
        // A short grace period, so one misread or mid-animation frame doesn't wipe the trade.
        leftMenuAt ??= Date.now()
        if (lastSignature !== null && Date.now() - leftMenuAt >= LEAVE_AFTER_MS) {
          latest.current.setSides([], [])
          lastSignature = null
        }
        return
      }
      leftMenuAt = null
      // More than the game's limit means a misread; keep the last good frame.
      if (!sides.withinLimit) return
      const sig = signature(sides)
      if (sig === lastSignature) return
      lastSignature = sig
      const { offering: currentOffering, requesting: currentRequesting } = latest.current
      latest.current.setSides(
        mergeInPlace(currentOffering, sides.offering),
        mergeInPlace(currentRequesting, sides.requesting)
      )
    })
  }, [])

  return (
    <CalculatorContext.Provider
      value={{
        composer,
        activeSide,
        setActiveSide,
        offeringTotal: sideValue(offering),
        requestingTotal: sideValue(requesting),
        applyScan,
        browse
      }}
    >
      {children}
    </CalculatorContext.Provider>
  )
}

export function useCalculator(): CalculatorContextValue {
  const ctx = useContext(CalculatorContext)
  if (!ctx) throw new Error('useCalculator must be used inside CalculatorProvider')
  return ctx
}
