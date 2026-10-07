import { useCalculator } from '@renderer/contexts/CalculatorContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { SearchInput } from '@renderer/components/ui/search-input'
import { ColorChip, SectionHeader, SortMenu, TypeTiles } from '@renderer/components/values/ValuesSidebarFilters'
import { LOCAL_SORT_GROUPS } from '@renderer/lib/itemBrowse'
import { demandOrder, getDemandColor, getTrendColor, trendOrder } from '@renderer/lib/itemValueUtils'

export function CalculatorSidebar(): React.JSX.Element {
  const { browse } = useCalculator()
  const { user } = useCurrentUser()
  const activeCount = browse.types.size + browse.demand.size + browse.trend.size

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
          <button
            type="button"
            onClick={browse.clearFilters}
            className="text-[11px] font-semibold text-link hover:text-link-hover"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 px-3 pb-3">
        {user?.roblox?.roblox_id && (
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border-card bg-tertiary-bg p-1">
            {(['catalog', 'inventory'] as const).map((source) => (
              <button
                key={source}
                type="button"
                onClick={() => browse.setSource(source)}
                className={`rounded-lg py-1.5 text-xs font-medium transition-colors ${
                  browse.source === source
                    ? 'bg-button-info text-form-button-text'
                    : 'text-secondary-text hover:text-primary-text'
                }`}
              >
                {source === 'catalog' ? 'Values List' : 'My Inventory'}
              </button>
            ))}
          </div>
        )}
        <SearchInput value={browse.search} onChange={browse.setSearch} placeholder="Search items..." />
        <SortMenu value={browse.sort} onChange={browse.setSort} groups={LOCAL_SORT_GROUPS} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-border-primary px-2 pt-3 pb-2">
        <SectionHeader label="Type" count={browse.types.size} onClear={() => browse.types.forEach(browse.toggleType)} />
        <TypeTiles selected={browse.types} onToggle={browse.toggleType} />

        <div className="mt-3">
          <SectionHeader
            label="Demand"
            count={browse.demand.size}
            onClear={() => browse.demand.forEach(browse.toggleDemand)}
          />
          <div className="flex flex-wrap gap-1.5">
            {demandOrder.map((demand) => (
              <ColorChip
                key={demand}
                label={demand}
                colorClass={getDemandColor(demand)}
                active={browse.demand.has(demand)}
                onClick={() => browse.toggleDemand(demand)}
              />
            ))}
          </div>
        </div>

        <div className="mt-3">
          <SectionHeader label="Trend" count={browse.trend.size} onClear={() => browse.trend.forEach(browse.toggleTrend)} />
          <div className="flex flex-wrap gap-1.5">
            {trendOrder.map((trend) => (
              <ColorChip
                key={trend}
                label={trend}
                colorClass={getTrendColor(trend)}
                active={browse.trend.has(trend)}
                onClick={() => browse.toggleTrend(trend)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
