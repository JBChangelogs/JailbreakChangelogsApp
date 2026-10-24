import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useItems } from '@renderer/hooks/useItems'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { useTabState, useTabTitle } from '@renderer/contexts/TabsContext'
import { dupesApi, DupeUserNotFoundError } from '@renderer/lib/dupesApi'
import { parseCashValue } from '@renderer/lib/itemValueUtils'
import {
  nextTradesCursor,
  tradeHistoryApi,
  type TradeActivity,
  type TradeDetail,
  type TradeItemDetail,
  type UserTradeSummary
} from '@renderer/lib/tradeHistoryApi'
import type { RobloxUserSummary } from '@shared/dupe'
import type { Item } from '@shared/item'

export type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'not-found'; message: string }
  | { status: 'ready'; robloxId: string }

export type ActivityState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; activity: TradeActivity }

export type DetailState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; detail: TradeDetail }

interface TradeHistoryContextValue {
  lookup: LookupState
  search: (input: string) => void
  showOwnTrades: (() => void) | null
  trades: UserTradeSummary[]
  listError: string | null
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => void
  retry: () => void
  profiles: Record<string, RobloxUserSummary>
  expandedId: string | null
  toggleTrade: (tradeId: string) => void
  details: Record<string, DetailState>
  retryDetail: (tradeId: string) => void
  catalogItem: (item: TradeItemDetail) => Item | null
  itemValue: (item: TradeItemDetail) => number | null
  activity: ActivityState | null
  selectedDay: string | null
  selectDay: (day: string | null) => void
}

const TradeHistoryContext = createContext<TradeHistoryContextValue | null>(null)

const catalogKey = (name: string, type: string): string =>
  `${type.trim().toLowerCase()}::${name.trim().toLowerCase().replace(/\s+/g, ' ')}`

const knownValue = (value: string | null): number | null => {
  const parsed = parseCashValue(value)
  return parsed < 0 ? null : parsed
}

export function TradeHistoryProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { items } = useItems()
  const { user } = useCurrentUser()
  const ownRobloxId = user?.roblox?.roblox_id ? String(user.roblox.roblox_id) : null
  const [savedId, setSavedId] = useTabState<string | null>('tradehistory.user', null)
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' })
  const [trades, setTrades] = useState<UserTradeSummary[]>([])
  const [cursor, setCursor] = useState<number | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [profiles, setProfiles] = useState<Record<string, RobloxUserSummary>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, DetailState>>({})
  const [activity, setActivity] = useState<ActivityState | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const generation = useRef(0)

  const fetchProfiles = useCallback((ids: string[]) => {
    const missing = [...new Set(ids)].filter((id) => id)
    if (missing.length === 0) return
    dupesApi
      .fetchUsersBatch(missing)
      .then((batch) => setProfiles((prev) => ({ ...prev, ...batch })))
      .catch(() => {})
  }, [])

  const addPage = useCallback(
    (page: { completed: UserTradeSummary[]; pending: UserTradeSummary[] }, reset: boolean) => {
      setTrades((prev) => {
        const byId = new Map((reset ? [] : prev).map((trade) => [trade.trade_id, trade]))
        for (const trade of [...page.completed, ...page.pending]) byId.set(trade.trade_id, trade)
        return [...byId.values()].sort((a, b) => b.last_time - a.last_time)
      })
      setCursor(nextTradesCursor(page))
      fetchProfiles([...page.completed, ...page.pending].map((trade) => trade.counterparty_user_id))
    },
    [fetchProfiles]
  )

  const load = useCallback(
    (robloxId: string) => {
      const id = ++generation.current
      setSavedId(robloxId)
      setLookup({ status: 'ready', robloxId })
      setTrades([])
      setCursor(null)
      setListError(null)
      setExpandedId(null)
      setSelectedDay(null)
      setLoadingMore(true)
      setActivity({ status: 'loading' })
      fetchProfiles([robloxId])
      tradeHistoryApi
        .fetchActivity(robloxId)
        .then((result) => {
          if (id === generation.current) setActivity({ status: 'ready', activity: result })
        })
        .catch(() => {
          if (id === generation.current) setActivity({ status: 'error' })
        })
      tradeHistoryApi
        .fetchUserTrades(robloxId, null)
        .then((page) => {
          if (id === generation.current) addPage(page, true)
        })
        .catch((err: unknown) => {
          if (id === generation.current) setListError(err instanceof Error ? err.message : "Couldn't load trade history.")
        })
        .finally(() => {
          if (id === generation.current) setLoadingMore(false)
        })
    },
    [addPage, fetchProfiles, setSavedId]
  )

  const search = useCallback(
    (input: string) => {
      const query = input.trim()
      if (!query) return
      if (/^\d+$/.test(query)) {
        load(query)
        return
      }
      const id = ++generation.current
      setLookup({ status: 'loading' })
      dupesApi
        .resolveUsername(query)
        .then((found) => {
          if (id !== generation.current) return
          if (!found) {
            setLookup({ status: 'not-found', message: `Username "${query}" not found. Check the spelling and try again.` })
            return
          }
          setProfiles((prev) => ({ ...prev, [String(found.id)]: found }))
          load(String(found.id))
        })
        .catch((err: unknown) => {
          if (id !== generation.current) return
          setLookup({
            status: 'not-found',
            message:
              err instanceof DupeUserNotFoundError
                ? `Username "${query}" not found. Check the spelling and try again.`
                : 'Server error while looking up that username. Try searching by Roblox ID instead.'
          })
        })
    },
    [load]
  )

  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    const initial = savedId ?? ownRobloxId
    if (!initial) return
    startedRef.current = true
    load(initial)
  }, [savedId, ownRobloxId, load])

  const robloxId = lookup.status === 'ready' ? lookup.robloxId : null

  const loadMore = useCallback(() => {
    if (!robloxId || cursor === null || loadingMore || listError) return
    const id = generation.current
    setLoadingMore(true)
    tradeHistoryApi
      .fetchUserTrades(robloxId, cursor)
      .then((page) => {
        if (id === generation.current) addPage(page, false)
      })
      .catch((err: unknown) => {
        if (id === generation.current) setListError(err instanceof Error ? err.message : "Couldn't load more trades.")
      })
      .finally(() => {
        if (id === generation.current) setLoadingMore(false)
      })
  }, [robloxId, cursor, loadingMore, listError, addPage])

  const retry = useCallback(() => {
    if (!robloxId) return
    if (trades.length === 0) {
      load(robloxId)
      return
    }
    setListError(null)
  }, [robloxId, trades.length, load])

  const fetchDetail = useCallback((tradeId: string) => {
    setDetails((prev) => ({ ...prev, [tradeId]: { status: 'loading' } }))
    tradeHistoryApi
      .fetchTrade(tradeId)
      .then((detail) => setDetails((prev) => ({ ...prev, [tradeId]: { status: 'ready', detail } })))
      .catch((err: unknown) =>
        setDetails((prev) => ({
          ...prev,
          [tradeId]: { status: 'error', message: err instanceof Error ? err.message : "Couldn't load this trade." }
        }))
      )
  }, [])

  const toggleTrade = useCallback(
    (tradeId: string) => {
      setExpandedId((current) => (current === tradeId ? null : tradeId))
      if (!details[tradeId] || details[tradeId].status === 'error') fetchDetail(tradeId)
    },
    [details, fetchDetail]
  )

  const catalog = useMemo(() => new Map(items.map((item) => [catalogKey(item.name, item.type), item])), [items])

  const catalogItem = useCallback(
    (item: TradeItemDetail): Item | null => catalog.get(catalogKey(item.title, item.category_title)) ?? null,
    [catalog]
  )

  const itemValue = useCallback(
    (item: TradeItemDetail): number | null => {
      const found = catalogItem(item)
      if (!found) return null
      if (item.is_duplicate_branch) {
        const duped = knownValue(found.duped_value)
        if (duped !== null) return duped
      }
      return knownValue(found.cash_value)
    },
    [catalogItem]
  )

  const lookedUp = robloxId ? profiles[robloxId] : undefined
  const lookedUpName = lookedUp?.displayName || lookedUp?.name
  useTabTitle(lookedUpName ? `Trade History | ${lookedUpName}` : undefined)

  const value: TradeHistoryContextValue = {
    lookup,
    search,
    showOwnTrades: ownRobloxId && ownRobloxId !== robloxId ? () => load(ownRobloxId) : null,
    trades,
    listError,
    loadingMore,
    hasMore: cursor !== null,
    loadMore,
    retry,
    profiles,
    expandedId,
    toggleTrade,
    details,
    retryDetail: fetchDetail,
    catalogItem,
    itemValue,
    activity,
    selectedDay,
    selectDay: setSelectedDay
  }

  return <TradeHistoryContext.Provider value={value}>{children}</TradeHistoryContext.Provider>
}

export function useTradeHistory(): TradeHistoryContextValue {
  const ctx = useContext(TradeHistoryContext)
  if (!ctx) throw new Error('useTradeHistory must be used within a TradeHistoryProvider')
  return ctx
}
