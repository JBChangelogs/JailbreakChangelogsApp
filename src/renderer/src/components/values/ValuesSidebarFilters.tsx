import { useState } from 'react'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { SearchInput } from '@renderer/components/ui/search-input'
import { FilterMenu } from '@renderer/components/tracker/FilterMenus'
import { getCategoryColor, getCategoryIcon } from '@renderer/lib/categoryIcons'
import { useValues } from '@renderer/contexts/ValuesContext'
import { TAG_FILTERS } from '@renderer/hooks/useValuesFilters'
import { ITEM_TYPE_FILTERS, VALUE_SORT_GROUPS, demandOrder, trendOrder, type ValueSort } from '@renderer/lib/itemValueUtils'
import { ItemCommentsSidebar } from '@renderer/components/values/itemdetail/ItemCommentsSidebar'

function ChevronDownIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  )
}

const SORT_OPTIONS = VALUE_SORT_GROUPS.flatMap((g) => g.options)

export function ValuesSidebarFilters(): React.JSX.Element {
  const {
    searchQuery,
    setSearchQuery,
    sort,
    setSort,
    selectedTags,
    toggleTag,
    selectedTypes,
    toggleType,
    clearTypes,
    selectedDemand,
    toggleDemand,
    clearDemand,
    selectedTrend,
    toggleTrend,
    clearTrend,
    selectedItem
  } = useValues()

  const [showAdvanced, setShowAdvanced] = useState(false)

  if (selectedItem) {
    return <ItemCommentsSidebar item={selectedItem} />
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="px-3 py-2.5">
        <h1 className="text-xs font-bold uppercase tracking-wide text-quaternary-text">Filters</h1>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-3">
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search items..." />
        <FilterMenu<ValueSort> label="Sort" value={sort} options={SORT_OPTIONS} onChange={setSort} />

        <div className="flex flex-wrap gap-1.5">
          {TAG_FILTERS.map((tag) => {
            const active = selectedTags.has(tag.value)
            return (
              <button
                key={tag.value}
                type="button"
                onClick={() => toggleTag(tag.value)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${active
                  ? 'border-button-info/40 bg-button-info/20 text-primary-text'
                  : 'border-border-card bg-tertiary-bg text-secondary-text hover:bg-quaternary-bg'
                  }`}
              >
                {tag.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-quaternary-text">
            Type ({ITEM_TYPE_FILTERS.length})
          </span>
          {selectedTypes.size > 0 && (
            <button type="button" onClick={clearTypes} className="text-[10px] font-semibold text-link hover:text-link-hover">
              Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-1">
          {ITEM_TYPE_FILTERS.map((filter) => {
            const active = selectedTypes.has(filter.value)
            const color = getCategoryColor(filter.type)
            const CategoryIcon = getCategoryIcon(filter.type)
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => toggleType(filter.value)}
                className="flex items-center gap-1.5 rounded-lg border-2 bg-tertiary-bg p-2 transition-colors hover:bg-(--hover-bg)"
                style={
                  {
                    borderColor: color,
                    '--hover-bg': `${color}1A`,
                    ...(active ? { boxShadow: `0 0 0 1.5px ${color}` } : {})
                  } as React.CSSProperties
                }
              >
                {CategoryIcon && <CategoryIcon className="h-4 w-4 shrink-0" style={{ color }} />}
                <span className="truncate text-[11px] font-semibold text-primary-text">{filter.label}</span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="mt-2 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-quaternary-text hover:bg-quaternary-bg"
        >
          Advanced Filters
          <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-quaternary-text">Demand</span>
              {selectedDemand.size > 0 && (
                <button type="button" onClick={clearDemand} className="text-[10px] font-semibold text-link hover:text-link-hover">
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {demandOrder.map((demand) => (
                <label
                  key={demand}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-quaternary-bg"
                >
                  <Checkbox checked={selectedDemand.has(demand)} onCheckedChange={() => toggleDemand(demand)} />
                  <span className="truncate text-[13px] text-primary-text">{demand}</span>
                </label>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between px-2 py-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-quaternary-text">Trend</span>
              {selectedTrend.size > 0 && (
                <button type="button" onClick={clearTrend} className="text-[10px] font-semibold text-link hover:text-link-hover">
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-0.5">
              {trendOrder.map((trend) => (
                <label
                  key={trend}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-quaternary-bg"
                >
                  <Checkbox checked={selectedTrend.has(trend)} onCheckedChange={() => toggleTrend(trend)} />
                  <span className="truncate text-[13px] text-primary-text">{trend}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
