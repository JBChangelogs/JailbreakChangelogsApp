import { useTabSet, useTabState } from '@renderer/contexts/TabsContext'
import type { ValueSort } from '@renderer/lib/itemValueUtils'

export type TagFilter = 'seasonal' | 'limited' | 'untradeable'
export const TAG_FILTERS: readonly { value: TagFilter; label: string }[] = [
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'limited', label: 'Limited' },
  { value: 'untradeable', label: 'Untradable' }
]

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
  const [searchQuery, setSearchQuery] = useTabState('values.search', '')
  const [selectedTypes, toggleType, clearTypes] = useTabSet('values.types')
  const [selectedDemand, toggleDemand, clearDemand] = useTabSet('values.demand')
  const [selectedTrend, toggleTrend, clearTrend] = useTabSet('values.trend')
  const [selectedTags, toggleTag] = useTabSet<TagFilter>('values.tags')
  const [sort, setSort] = useTabState<ValueSort>('values.sort', 'cash-desc')

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
