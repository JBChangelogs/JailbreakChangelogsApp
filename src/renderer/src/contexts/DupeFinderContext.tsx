import { createContext, useContext, useMemo, useState } from 'react'
import { useItems } from '@renderer/hooks/useItems'
import { dupesApi, DupeUserNotFoundError, NoDupesFoundError } from '@renderer/lib/dupesApi'
import { computeDuplicateInfo, getDupedValueForItem, mergeDupeFinderWithMetadata } from '@renderer/lib/dupeUtils'
import type { DupeFinderItem, RobloxUserSummary } from '@shared/dupe'
import type { Item } from '@shared/item'

export type SortOrder = 'duplicates' | 'alpha-asc' | 'alpha-desc' | 'created-asc' | 'created-desc' | 'duped-desc' | 'duped-asc'

export const SORT_OPTIONS: readonly { value: SortOrder; label: string }[] = [
  { value: 'duplicates', label: 'Duplicates First' },
  { value: 'alpha-asc', label: 'Name (A-Z)' },
  { value: 'alpha-desc', label: 'Name (Z-A)' },
  { value: 'created-desc', label: 'Logged (Newest)' },
  { value: 'created-asc', label: 'Logged (Oldest)' },
  { value: 'duped-desc', label: 'Duped Value (High-Low)' },
  { value: 'duped-asc', label: 'Duped Value (Low-High)' }
]

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'not-found'; message: string }
  | { status: 'no-dupes'; robloxId: string; user: RobloxUserSummary | null }
  | { status: 'success'; robloxId: string; user: RobloxUserSummary | null; items: DupeFinderItem[] }

export type CompareState =
  | { status: 'closed' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; og: DupeFinderItem; duplicate: DupeFinderItem }

export function currentOwnerId(item: DupeFinderItem, fallback: string): string {
  return item.latest_owner || item.user_id || fallback
}

interface DupeFinderContextValue {
  state: SearchState
  search: (input: string) => void
  searchTerm: string
  setSearchTerm: (value: string) => void
  selectedCategories: Set<string>
  toggleCategory: (category: string) => void
  clearCategories: () => void
  sortOrder: SortOrder
  setSortOrder: (value: SortOrder) => void
  categories: string[]
  sortedData: DupeFinderItem[]
  mergedDupeCount: number
  totalDupedValue: number
  duplicateCounts: Map<string, number>
  duplicateOrders: Map<string, number>
  itemsMap: Map<number, Item>
  ownerProfiles: Record<string, RobloxUserSummary>
  selectedItem: DupeFinderItem | null
  selectItem: (item: DupeFinderItem | null) => void
  compareState: CompareState
  openCompare: (dupeFinderItemId: string) => void
  closeCompare: () => void
}

const DupeFinderContext = createContext<DupeFinderContextValue | null>(null)

export function DupeFinderProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { items: itemsData } = useItems()
  const [state, setState] = useState<SearchState>({ status: 'idle' })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [sortOrder, setSortOrder] = useState<SortOrder>('duplicates')
  const [ownerProfiles, setOwnerProfiles] = useState<Record<string, RobloxUserSummary>>({})
  const [selectedItem, setSelectedItem] = useState<DupeFinderItem | null>(null)
  const [compareState, setCompareState] = useState<CompareState>({ status: 'closed' })

  const search = (input: string): void => {
    setState({ status: 'loading' })
    setSearchTerm('')
    setSelectedCategories(new Set())
    setOwnerProfiles({})
    setSelectedItem(null)
    setCompareState({ status: 'closed' })
    void performSearch(input)
  }

  const selectItem = (item: DupeFinderItem | null): void => {
    setSelectedItem(item)
    if (!item) return
    const missingIds = [...new Set(item.history.map((entry) => String(entry.UserId)))].filter(
      (id) => !(id in ownerProfiles)
    )
    if (missingIds.length === 0) return
    dupesApi
      .fetchUsersBatch(missingIds)
      .then((batch) => setOwnerProfiles((prev) => ({ ...prev, ...batch })))
      .catch(() => {
      })
  }

  const openCompare = (dupeFinderItemId: string): void => {
    setCompareState({ status: 'loading' })
    dupesApi
      .fetchDuplicateVariants(dupeFinderItemId)
      .then((result) => {
        if (!result) {
          setCompareState({ status: 'error', message: 'No matching variant found for this item.' })
          return
        }
        setCompareState({ status: 'ready', og: result.og, duplicate: result.duplicate })
        const ids = new Set<string>()
        for (const item of [result.og, result.duplicate]) {
          ids.add(currentOwnerId(item, ''))
          for (const entry of item.history) ids.add(String(entry.UserId))
        }
        ids.delete('')
        dupesApi
          .fetchUsersBatch([...ids])
          .then((batch) => setOwnerProfiles((prev) => ({ ...prev, ...batch })))
          .catch(() => {})
      })
      .catch(() => setCompareState({ status: 'error', message: 'Server error while comparing variants.' }))
  }

  const closeCompare = (): void => setCompareState({ status: 'closed' })

  const performSearch = async (input: string): Promise<void> => {
    const isUsername = !/^\d+$/.test(input)
    let robloxId = input

    if (isUsername) {
      try {
        const user = await dupesApi.resolveUsername(input)
        if (!user) {
          setState({ status: 'not-found', message: `Username "${input}" not found. Please check the spelling and try again.` })
          return
        }
        robloxId = String(user.id)
      } catch (err) {
        setState({
          status: 'not-found',
          message:
            err instanceof DupeUserNotFoundError
              ? `Username "${input}" not found. Please check the spelling and try again.`
              : 'Server error while looking up that username. Please try searching by Roblox ID instead.'
        })
        return
      }
    }

    const searchedUserPromise = dupesApi.fetchUsersBatch([robloxId]).catch(() => ({}))
    try {
      const dupeItems = await dupesApi.fetchUserDupes(robloxId)
      const user = (await searchedUserPromise)[robloxId] ?? null

      if (dupeItems.length === 0) {
        setState({ status: 'no-dupes', robloxId, user })
        return
      }

      setState({ status: 'success', robloxId, user, items: dupeItems })
      setOwnerProfiles((prev) => ({ ...prev, ...(user ? { [robloxId]: user } : {}) }))

      const ownerIds = [...new Set(dupeItems.map((item) => currentOwnerId(item, robloxId)))]
      dupesApi
        .fetchUsersBatch(ownerIds)
        .then((batch) => setOwnerProfiles((prev) => ({ ...prev, ...batch })))
        .catch(() => {
        })
    } catch (err) {
      const user = (await searchedUserPromise)[robloxId] ?? null
      if (err instanceof NoDupesFoundError) {
        setState({ status: 'no-dupes', robloxId, user })
      } else {
        setState({ status: 'not-found', message: 'Server error while fetching dupe data. Please try again later.' })
      }
    }
  }

  const mergedDupeData = useMemo(
    () => (state.status === 'success' ? mergeDupeFinderWithMetadata(state.items, itemsData) : []),
    [state, itemsData]
  )

  const categories = useMemo(
    () => [...new Set(mergedDupeData.map((item) => item.categoryTitle))].sort(),
    [mergedDupeData]
  )

  const itemsMap = useMemo(() => new Map(itemsData.map((item) => [item.id, item])), [itemsData])

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return mergedDupeData.filter((item) => {
      if (!itemsMap.has(item.item_id)) return false
      const matchesSearch =
        !query || item.title.toLowerCase().includes(query) || item.categoryTitle.toLowerCase().includes(query)
      const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(item.categoryTitle)
      return matchesSearch && matchesCategory
    })
  }, [mergedDupeData, itemsMap, searchTerm, selectedCategories])

  const { counts: duplicateCounts, orders: duplicateOrders } = useMemo(
    () => computeDuplicateInfo(mergedDupeData),
    [mergedDupeData]
  )
  const hasDuplicates = useMemo(() => [...duplicateCounts.values()].some((count) => count > 1), [duplicateCounts])
  const effectiveSort: SortOrder = sortOrder === 'duplicates' && !hasDuplicates ? 'created-desc' : sortOrder

  const sortedData = useMemo(() => {
    const dupedValue = (item: DupeFinderItem): number => {
      const data = itemsMap.get(item.item_id)
      return data ? getDupedValueForItem(data) : 0
    }
    return [...filteredData].sort((a, b) => {
      switch (effectiveSort) {
        case 'duplicates': {
          const aCount = duplicateCounts.get(`${a.categoryTitle}-${a.title}`) ?? 0
          const bCount = duplicateCounts.get(`${b.categoryTitle}-${b.title}`) ?? 0
          if (aCount > 1 && bCount === 1) return -1
          if (aCount === 1 && bCount > 1) return 1
          const cmp = a.title.localeCompare(b.title)
          return cmp !== 0 ? cmp : a.id.localeCompare(b.id)
        }
        case 'alpha-asc':
          return a.title.localeCompare(b.title)
        case 'alpha-desc':
          return b.title.localeCompare(a.title)
        case 'created-asc':
          return a.logged_at - b.logged_at
        case 'created-desc':
          return b.logged_at - a.logged_at
        case 'duped-desc':
          return dupedValue(b) - dupedValue(a)
        case 'duped-asc':
          return dupedValue(a) - dupedValue(b)
        default:
          return 0
      }
    })
  }, [filteredData, effectiveSort, duplicateCounts, itemsMap])

  const totalDupedValue = useMemo(() => {
    let total = 0
    for (const dupeItem of mergedDupeData) {
      const data = itemsMap.get(dupeItem.item_id)
      if (data) total += getDupedValueForItem(data)
    }
    return total
  }, [mergedDupeData, itemsMap])

  const toggleCategory = (category: string): void => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const value: DupeFinderContextValue = {
    state,
    search,
    searchTerm,
    setSearchTerm,
    selectedCategories,
    toggleCategory,
    clearCategories: () => setSelectedCategories(new Set()),
    sortOrder,
    setSortOrder,
    categories,
    sortedData,
    mergedDupeCount: mergedDupeData.length,
    totalDupedValue,
    duplicateCounts,
    duplicateOrders,
    itemsMap,
    ownerProfiles,
    selectedItem,
    selectItem,
    compareState,
    openCompare,
    closeCompare
  }

  return <DupeFinderContext.Provider value={value}>{children}</DupeFinderContext.Provider>
}

export function useDupeFinder(): DupeFinderContextValue {
  const ctx = useContext(DupeFinderContext)
  if (!ctx) throw new Error('useDupeFinder must be used within a DupeFinderProvider')
  return ctx
}
