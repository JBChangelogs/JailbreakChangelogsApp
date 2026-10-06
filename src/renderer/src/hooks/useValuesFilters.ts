import { useCallback, useEffect, useState } from 'react'
import type { ValueSort } from '@renderer/lib/itemValueUtils'

export type TagFilter = 'seasonal' | 'limited' | 'untradeable'
export const TAG_FILTERS: readonly { value: TagFilter; label: string }[] = [
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'limited', label: 'Limited' },
  { value: 'untradeable', label: 'Untradable' }
]

const STORAGE_KEYS = {
  types: 'valuesTracker.selectedTypes',
  demand: 'valuesTracker.selectedDemand',
  trend: 'valuesTracker.selectedTrend',
  tags: 'valuesTracker.selectedTags',
  sort: 'valuesTracker.sort'
} as const

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed) : new Set()
  } catch {
    return new Set()
  }
}

function loadSort(): ValueSort {
  const raw = localStorage.getItem(STORAGE_KEYS.sort)
  return (raw as ValueSort) || 'cash-desc'
}

export function useValuesFilters(): {
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
} {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(() => loadSet(STORAGE_KEYS.types))
  const [selectedDemand, setSelectedDemand] = useState<Set<string>>(() => loadSet(STORAGE_KEYS.demand))
  const [selectedTrend, setSelectedTrend] = useState<Set<string>>(() => loadSet(STORAGE_KEYS.trend))
  const [selectedTags, setSelectedTags] = useState<Set<TagFilter>>(
    () => loadSet(STORAGE_KEYS.tags) as Set<TagFilter>
  )
  const [sort, setSort] = useState<ValueSort>(loadSort)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.types, JSON.stringify([...selectedTypes]))
  }, [selectedTypes])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.demand, JSON.stringify([...selectedDemand]))
  }, [selectedDemand])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.trend, JSON.stringify([...selectedTrend]))
  }, [selectedTrend])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tags, JSON.stringify([...selectedTags]))
  }, [selectedTags])
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.sort, sort)
  }, [sort])

  const makeToggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (value: string): void => {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const toggleType = useCallback(makeToggle(setSelectedTypes), [])
  const clearTypes = useCallback(() => setSelectedTypes(new Set()), [])
  const toggleDemand = useCallback(makeToggle(setSelectedDemand), [])
  const clearDemand = useCallback(() => setSelectedDemand(new Set()), [])
  const toggleTrend = useCallback(makeToggle(setSelectedTrend), [])
  const clearTrend = useCallback(() => setSelectedTrend(new Set()), [])
  const toggleTag = useCallback((value: TagFilter) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    selectedTypes,
    toggleType,
    clearTypes,
    selectedDemand,
    toggleDemand,
    clearDemand,
    selectedTrend,
    toggleTrend,
    clearTrend,
    selectedTags,
    toggleTag,
    sort,
    setSort
  }
}
