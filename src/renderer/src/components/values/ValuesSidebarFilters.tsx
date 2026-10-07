import { Fragment, useState } from 'react'
import { SearchInput } from '@renderer/components/ui/search-input'
import { DropdownTriggerButton } from '@renderer/components/tracker/FilterMenus'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { getCategoryColor, getCategoryIcon } from '@renderer/lib/categoryIcons'
import { useValues } from '@renderer/contexts/ValuesContext'
import { TAG_FILTERS } from '@renderer/hooks/useValuesFilters'
import {
  ITEM_TYPE_FILTERS,
  VALUE_SORT_GROUPS,
  demandOrder,
  getDemandColor,
  getTrendColor,
  trendOrder,
  type ItemTypeFilter,
  type ValueSort
} from '@renderer/lib/itemValueUtils'
import { ItemCommentsSidebar } from '@renderer/components/values/itemdetail/ItemCommentsSidebar'

function ChevronDownIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

const SORT_LABELS = new Map(VALUE_SORT_GROUPS.flatMap((g) => g.options.map((o) => [o.value, o.label])))

export function SortMenu({
  value,
  onChange,
  groups = VALUE_SORT_GROUPS
}: {
  value: ValueSort
  onChange: (value: ValueSort) => void
  groups?: typeof VALUE_SORT_GROUPS
}): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <DropdownTriggerButton label="Sort" value={SORT_LABELS.get(value) ?? ''} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-96 w-60 overflow-y-auto">
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as ValueSort)}>
          {groups.map((group, i) => (
            <Fragment key={group.label}>
              {i > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-[10px] font-bold tracking-wide text-quaternary-text uppercase">
                {group.label}
              </DropdownMenuLabel>
              {group.options.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </Fragment>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SectionHeader({
  label,
  count,
  onClear
}: {
  label: string
  count: number
  onClear: () => void
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between px-1 pb-1.5">
      <span className="text-[10px] font-bold tracking-wide text-quaternary-text uppercase">
        {label}
        {count > 0 && <span className="ml-1 text-link">({count})</span>}
      </span>
      {count > 0 && (
        <button type="button" onClick={onClear} className="text-[10px] font-semibold text-link hover:text-link-hover">
          Clear
        </button>
      )}
    </div>
  )
}

export function ColorChip({
  label,
  colorClass,
  active,
  onClick
}: {
  label: string
  colorClass: string
  active: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${active
        ? `border-transparent ${colorClass}`
        : 'border-border-card bg-tertiary-bg text-secondary-text hover:bg-quaternary-bg hover:text-primary-text'
        }`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${active ? 'bg-current opacity-70' : colorClass}`} />
      {label}
    </button>
  )
}

export function TypeTiles({
  selected,
  onToggle
}: {
  selected: ReadonlySet<string>
  onToggle: (value: ItemTypeFilter) => void
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {ITEM_TYPE_FILTERS.map((filter) => {
        const active = selected.has(filter.value)
        const color = getCategoryColor(filter.type)
        const CategoryIcon = getCategoryIcon(filter.type)
        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => onToggle(filter.value)}
            aria-pressed={active}
            className={`relative flex items-center gap-1.5 rounded-lg border p-2 transition-colors ${active ? '' : 'border-border-card bg-tertiary-bg hover:bg-quaternary-bg'
              }`}
            style={active ? { borderColor: color, backgroundColor: `${color}26` } : undefined}
          >
            {CategoryIcon && <CategoryIcon className="h-4 w-4 shrink-0" style={{ color }} />}
            <span className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold text-primary-text">
              {filter.label}
            </span>
            {active && (
              <span className="shrink-0" style={{ color }}>
                <CheckIcon className="h-3 w-3" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

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

  const advancedCount = selectedDemand.size + selectedTrend.size
  const [showAdvanced, setShowAdvanced] = useState(advancedCount > 0)
  const activeCount = selectedTypes.size + selectedTags.size + advancedCount

  if (selectedItem) {
    return <ItemCommentsSidebar item={selectedItem} />
  }

  const clearAll = (): void => {
    clearTypes()
    clearDemand()
    clearTrend()
    for (const tag of selectedTags) toggleTag(tag)
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 py-2.5">
        <h1 className="text-xs font-bold tracking-wide text-quaternary-text uppercase">
          Filters
          {activeCount > 0 && (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-button-info px-1 text-[10px] text-form-button-text">
              {activeCount}
            </span>
          )}
        </h1>
        {activeCount > 0 && (
          <button type="button" onClick={clearAll} className="text-[11px] font-semibold text-link hover:text-link-hover">
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 px-3 pb-3">
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search items..." />
        <SortMenu value={sort} onChange={setSort} />

        <div className="flex flex-wrap gap-1.5">
          {TAG_FILTERS.map((tag) => {
            const active = selectedTags.has(tag.value)
            return (
              <button
                key={tag.value}
                type="button"
                onClick={() => toggleTag(tag.value)}
                aria-pressed={active}
                className={`inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${active
                  ? 'border-button-info bg-button-info/20 text-primary-text'
                  : 'border-border-card bg-tertiary-bg text-secondary-text hover:bg-quaternary-bg hover:text-primary-text'
                  }`}
              >
                {tag.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-border-primary px-2 pt-3 pb-2">
        <SectionHeader label="Type" count={selectedTypes.size} onClear={clearTypes} />
        <TypeTiles selected={selectedTypes} onToggle={toggleType} />

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
          className="mt-3 flex w-full items-center justify-between rounded-md px-1 py-1.5 text-[10px] font-bold tracking-wide text-quaternary-text uppercase hover:text-secondary-text"
        >
          <span>
            Demand & Trend
            {!showAdvanced && advancedCount > 0 && <span className="ml-1 text-link">({advancedCount})</span>}
          </span>
          <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="mt-1 space-y-3">
            <div>
              <SectionHeader label="Demand" count={selectedDemand.size} onClear={clearDemand} />
              <div className="flex flex-wrap gap-1.5">
                {demandOrder.map((demand) => (
                  <ColorChip
                    key={demand}
                    label={demand}
                    colorClass={getDemandColor(demand)}
                    active={selectedDemand.has(demand)}
                    onClick={() => toggleDemand(demand)}
                  />
                ))}
              </div>
            </div>
            <div>
              <SectionHeader label="Trend" count={selectedTrend.size} onClear={clearTrend} />
              <div className="flex flex-wrap gap-1.5">
                {trendOrder.map((trend) => (
                  <ColorChip
                    key={trend}
                    label={trend}
                    colorClass={getTrendColor(trend)}
                    active={selectedTrend.has(trend)}
                    onClick={() => toggleTrend(trend)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
