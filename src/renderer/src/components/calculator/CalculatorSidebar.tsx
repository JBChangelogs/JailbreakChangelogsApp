import { useState } from 'react'
import { useCalculator } from '@renderer/contexts/CalculatorContext'
import { getClearShortcutsExpanded, setClearShortcutsExpanded } from '@renderer/lib/localPreferences'
import { Tabs } from '@renderer/components/ui/tabs'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { SearchInput } from '@renderer/components/ui/search-input'
import { Kbd } from '@renderer/components/ui/kbd'
import { ColorChip, SectionHeader, SortMenu, TypeTiles } from '@renderer/components/values/ValuesSidebarFilters'
import { LOCAL_SORT_GROUPS } from '@renderer/lib/itemBrowse'
import { demandOrder, getDemandColor, getTrendColor, trendOrder } from '@renderer/lib/itemValueUtils'

export function CalculatorSidebar(): React.JSX.Element {
  const { browse } = useCalculator()
  const { user } = useCurrentUser()
  const [shortcutsOpen, setShortcutsOpen] = useState(getClearShortcutsExpanded)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 p-2">
        <SearchInput value={browse.search} onChange={browse.setSearch} placeholder="Search items..." />
        <SortMenu value={browse.sort} onChange={browse.setSort} groups={LOCAL_SORT_GROUPS} />
        {user?.roblox?.roblox_id && (
          <Tabs
            value={browse.source}
            onChange={browse.setSource}
            options={[
              { value: 'catalog', label: 'Values List' },
              { value: 'inventory', label: 'My Inventory' }
            ]}
          />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-border-primary p-2">
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

      {/* Stays at the bottom while the filters scroll. */}
      <div className="shrink-0 border-t border-border-primary p-2">
        <button
          type="button"
          aria-expanded={shortcutsOpen}
          onClick={() => {
            setClearShortcutsExpanded(!shortcutsOpen)
            setShortcutsOpen(!shortcutsOpen)
          }}
          className="flex w-full items-center justify-between text-[11px] font-bold tracking-wide text-quaternary-text uppercase transition-colors hover:text-secondary-text"
        >
          Clear shortcuts
          <svg
            className={`h-3.5 w-3.5 transition-transform duration-200 ease-out ${shortcutsOpen ? '' : '-rotate-90'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <div
          aria-hidden={!shortcutsOpen}
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${shortcutsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <ul className="min-h-0 space-y-1.5 overflow-hidden text-[11px] text-secondary-text">
            <li className="pt-1.5">
              <Kbd>Shift</Kbd> + click: both sides
            </li>
            <li>
              <Kbd>Ctrl</Kbd> + click: Offering
            </li>
            <li>
              <Kbd>Ctrl</Kbd> + right-click: Requesting
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
