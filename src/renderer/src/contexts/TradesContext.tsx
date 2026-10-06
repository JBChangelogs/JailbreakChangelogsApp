import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { useTradeComposer, type TradeSide } from '@renderer/hooks/useTradeComposer'
import { tradesApi } from '@renderer/lib/tradesApi'
import { toCreatePayload, totalCount, type TradeItemDraft, type TradeItemDraftKey } from '@renderer/lib/tradeItemDraft'
import { EXPIRATION_HOURS_BY_TIER, isCustomTradeItemId } from '@shared/trading'
import type { Item } from '@shared/item'
import type { TradeAd } from '@shared/trading'

export type TradesTab = 'all' | 'mine'

export type TradesView = { type: 'list' } | { type: 'create' } | { type: 'detail'; id: number; makeOffer?: boolean }

interface TradesContextValue {
  ads: TradeAd[]
  loading: boolean
  error: string | null
  tab: TradesTab
  setTab: (tab: TradesTab) => void
  page: number
  totalPages: number
  setPage: (page: number) => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  refresh: () => void
  refreshToken: number
  bumpRefreshToken: () => void
  view: TradesView
  setView: (view: TradesView) => void

  createOffering: TradeItemDraft[]
  createRequesting: TradeItemDraft[]
  createActiveSide: TradeSide
  setCreateActiveSide: (side: TradeSide) => void
  addCreateItem: (item: Item, duped: boolean, og: boolean, side: TradeSide) => void
  addCreateCustomType: (customId: string, side: TradeSide) => void
  removeCreateItem: (side: TradeSide, key: TradeItemDraftKey, amount: number) => void
  setCreateItemCondition: (side: TradeSide, key: TradeItemDraftKey, next: { duped: boolean; og: boolean }) => void
  moveCreateItem: (side: TradeSide, key: TradeItemDraftKey) => void
  createNote: string
  setCreateNote: (note: string) => void
  createExpiration: number
  setCreateExpiration: (hours: number) => void
  unlockedExpirationHours: Set<number>
  createSubmitting: boolean
  createError: string | null
  canSubmitCreate: boolean
  hasRealOfferingItem: boolean
  submitCreateAd: () => Promise<void>
}

const TradesContext = createContext<TradesContextValue | null>(null)

export function TradesProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { token } = useAuth()
  const { user } = useCurrentUser()
  const [tab, setTabState] = useState<TradesTab>('all')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [ads, setAds] = useState<TradeAd[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [view, setView] = useState<TradesView>({ type: 'list' })

  const setTab = (next: TradesTab): void => {
    setTabState(next)
    setPage(1)
  }

  const load = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    const userFilter = tab === 'mine' ? (user?.id ?? undefined) : undefined
    tradesApi
      .listRecent(token, page, userFilter)
      .then((res) => {
        setAds(res.items)
        setTotalPages(Math.max(1, res.total_pages))
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load trade ads'))
      .finally(() => setLoading(false))
  }, [token, tab, page, user?.id])

  useEffect(() => {
    if (tab === 'mine' && !user?.id) return
    load()
  }, [load, tab, user?.id])

  const filteredAds =
    searchQuery.trim().length > 0
      ? ads.filter((ad) => {
          const query = searchQuery.trim().toLowerCase()
          return (
            ad.offering.some((item) => item.name?.toLowerCase().includes(query)) ||
            ad.requesting.some((item) => item.name?.toLowerCase().includes(query))
          )
        })
      : ads

  const composer = useTradeComposer()
  const [createActiveSide, setCreateActiveSide] = useState<TradeSide>('offering')
  const [createNote, setCreateNote] = useState('')
  const [createExpiration, setCreateExpiration] = useState(6)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const tier = user?.supporter ?? 0
  const unlockedExpirationHours = new Set(EXPIRATION_HOURS_BY_TIER[tier] ?? [6])
  const hasRealOfferingItem = composer.offering.some((item) => !isCustomTradeItemId(item.id))
  const canSubmitCreate =
    hasRealOfferingItem &&
    composer.requesting.length > 0 &&
    !createSubmitting &&
    totalCount(composer.offering) > 0

  const submitCreateAd = async (): Promise<void> => {
    if (!token) return
    setCreateSubmitting(true)
    setCreateError(null)
    try {
      const created = await tradesApi.create(token, {
        offering: toCreatePayload(composer.offering),
        requesting: toCreatePayload(composer.requesting),
        note: createNote.trim() || null,
        expiration: createExpiration
      })
      composer.reset()
      setCreateNote('')
      setRefreshToken((n) => n + 1)
      load()
      setView({ type: 'detail', id: created.id })
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create trade ad')
    } finally {
      setCreateSubmitting(false)
    }
  }

  const value: TradesContextValue = {
    ads: filteredAds,
    loading,
    error,
    tab,
    setTab,
    page,
    totalPages,
    setPage,
    searchQuery,
    setSearchQuery,
    refresh: load,
    refreshToken,
    bumpRefreshToken: () => setRefreshToken((n) => n + 1),
    view,
    setView,
    createOffering: composer.offering,
    createRequesting: composer.requesting,
    createActiveSide,
    setCreateActiveSide,
    addCreateItem: (item, duped, og, side) => composer.addItem(side, item, duped, og),
    addCreateCustomType: (customId, side) => composer.addCustomType(side, customId),
    removeCreateItem: composer.removeAmount,
    setCreateItemCondition: composer.setCondition,
    moveCreateItem: composer.moveToOtherSide,
    createNote,
    setCreateNote,
    createExpiration,
    setCreateExpiration,
    unlockedExpirationHours,
    createSubmitting,
    createError,
    canSubmitCreate,
    hasRealOfferingItem,
    submitCreateAd
  }

  return <TradesContext.Provider value={value}>{children}</TradesContext.Provider>
}

export function useTrades(): TradesContextValue {
  const ctx = useContext(TradesContext)
  if (!ctx) throw new Error('useTrades must be used within a TradesProvider')
  return ctx
}
