import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { refreshItems } from '@renderer/hooks/useItems'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { useValuesFilters, TAG_FILTERS, type TagFilter } from '@renderer/hooks/useValuesFilters'
import { itemsApi } from '@renderer/lib/itemDetailApi'
import type { ValueSort } from '@renderer/lib/itemValueUtils'
import { getLastSelectedItemId, setLastSelectedItemId } from '@renderer/lib/localPreferences'
import type { Item } from '@shared/item'

interface ValuesContextValue {
  items: Item[]
  total: number
  loading: boolean
  loadingMore: boolean
  error: boolean
  hasMore: boolean
  loadMore: () => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  selectedTypes: Set<string>
  toggleType: (value: string) => void
  clearTypes: () => void
  selectedDemand: Set<string>
  toggleDemand: (value: string) => void
  clearDemand: () => void
  selectedTrend: Set<string>
  toggleTrend: (value: string) => void
  clearTrend: () => void
  selectedTags: Set<TagFilter>
  toggleTag: (value: TagFilter) => void
  sort: ValueSort
  setSort: (value: ValueSort) => void
  selectedItemId: number | null
  selectItem: (id: number | null) => void
  selectedItem: Item | null
}

const ValuesContext = createContext<ValuesContextValue | null>(null)

const SEARCH_DEBOUNCE_MS = 300

const slug = (value: string): string => value.toLowerCase().replace(/\s+/g, '-')

function toServerFilters(types: Set<string>, demand: Set<string>, trend: Set<string>, tags: Set<TagFilter>): string[] {
  return [
    ...[...types].map((t) => `name-${t}`),
    ...[...demand].map((d) => `demand-${slug(d)}`),
    ...[...trend].map((t) => `trend-${slug(t)}`),
    ...[...tags].map((t) => `name-${t}-items`)
  ]
}

export function ValuesProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { subscribe } = useRealtime()
  const filters = useValuesFilters()
  const { searchQuery, selectedTypes, selectedDemand, selectedTrend, selectedTags, sort } = filters

  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const queryId = useRef(0)

  const serverFilters = toServerFilters(selectedTypes, selectedDemand, selectedTrend, selectedTags)
  const filterKey = serverFilters.join(',')

  useEffect(() => {
    return subscribe((message) => {
      if (message.action !== 'refresh_values') return
      setReloadKey((k) => k + 1)
      void refreshItems()
    })
  }, [subscribe])

  useEffect(() => {
    const id = ++queryId.current
    setLoading(true)
    setError(false)
    const query = searchQuery.trim()
    const idMatch = query.match(/^id:\s*(\d+)$/i)
    const timer = setTimeout(
      () => {
        const request = idMatch
          ? itemsApi.get(Number(idMatch[1])).then((item) => ({ items: item ? [item] : [], total: item ? 1 : 0 }))
          : itemsApi.list({ page: 1, sort, filters: filterKey ? filterKey.split(',') : [], search: query })
        request
          .then((res) => {
            if (id !== queryId.current) return
            setItems(res.items)
            setTotal(res.total)
            setPage(1)
          })
          .catch(() => {
            if (id === queryId.current) setError(true)
          })
          .finally(() => {
            if (id === queryId.current) setLoading(false)
          })
      },
      query ? SEARCH_DEBOUNCE_MS : 0
    )
    return () => clearTimeout(timer)
  }, [searchQuery, filterKey, sort, reloadKey])

  const hasMore = !loading && items.length < total

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return
    const id = queryId.current
    const next = page + 1
    setLoadingMore(true)
    itemsApi
      .list({ page: next, sort, filters: filterKey ? filterKey.split(',') : [], search: searchQuery })
      .then((res) => {
        if (id !== queryId.current) return
        setItems((prev) => [...prev, ...res.items])
        setTotal(res.total)
        setPage(next)
      })
      .catch(() => {
      })
      .finally(() => setLoadingMore(false))
  }, [hasMore, loadingMore, page, sort, filterKey, searchQuery])

  const [selectedItemId, setSelectedItemIdState] = useState<number | null>(() => getLastSelectedItemId())
  const selectItem = (id: number | null): void => {
    setSelectedItemIdState(id)
    setLastSelectedItemId(id)
  }

  const loadedSelected = selectedItemId != null ? (items.find((i) => i.id === selectedItemId) ?? null) : null
  const [fetchedSelected, setFetchedSelected] = useState<Item | null>(null)
  useEffect(() => {
    if (selectedItemId == null || loadedSelected) return undefined
    let cancelled = false
    itemsApi
      .get(selectedItemId)
      .then((item) => {
        if (!cancelled) setFetchedSelected(item)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [selectedItemId, loadedSelected])
  const selectedItem = loadedSelected ?? (fetchedSelected?.id === selectedItemId ? fetchedSelected : null)

  const value: ValuesContextValue = {
    items,
    total,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    ...filters,
    selectedItemId,
    selectItem,
    selectedItem
  }

  return <ValuesContext.Provider value={value}>{children}</ValuesContext.Provider>
}

export function useValues(): ValuesContextValue {
  const ctx = useContext(ValuesContext)
  if (!ctx) throw new Error('useValues must be used within a ValuesProvider')
  return ctx
}

export { TAG_FILTERS }
