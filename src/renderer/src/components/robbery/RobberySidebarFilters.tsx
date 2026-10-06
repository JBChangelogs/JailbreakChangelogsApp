import { useMemo } from 'react'
import { SearchInput } from '@renderer/components/ui/search-input'
import { Switch } from '@renderer/components/ui/switch'
import { CountryFilterMenu, FilterMenu } from '@renderer/components/tracker/FilterMenus'
import { useRobberyTracker } from '@renderer/contexts/RobberyTrackerContext'
import { ROBBERY_TYPES } from '@renderer/lib/robberyUtils'
import type { ServerSizeFilter, TimeSort } from '@renderer/hooks/useRobberyFilters'

export function RobberySidebarFilters(): React.JSX.Element {
  const {
    robberies,
    selectedTypes,
    toggleType,
    clearTypes,
    serverSize,
    setServerSize,
    timeSort,
    setTimeSort,
    searchQuery,
    setSearchQuery,
    selectedCountries,
    toggleCountry,
    clearCountries,
    topCountries,
    hideJoinedServers,
    setHideJoinedServers
  } = useRobberyTracker()

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const robbery of robberies) {
      if (robbery.status !== 1 && robbery.status !== 2) continue
      if (serverSize !== 'all') {
        const playerCount = robbery.server?.players?.length ?? 0
        const matchesSize = serverSize === 'big' ? playerCount >= 9 : playerCount < 9
        if (!matchesSize) continue
      }
      counts.set(robbery.marker_name, (counts.get(robbery.marker_name) ?? 0) + 1)
    }
    return counts
  }, [robberies, serverSize])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="px-3 py-2.5">
        <h1 className="text-xs font-bold uppercase tracking-wide text-quaternary-text">Filters</h1>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-3">
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search robberies..." />
        <FilterMenu label="Size" value={serverSize} options={SERVER_SIZE_OPTIONS} onChange={setServerSize} />
        <FilterMenu label="Sort" value={timeSort} options={TIME_SORT_OPTIONS} onChange={setTimeSort} />
        {topCountries.length > 0 && (
          <CountryFilterMenu
            countries={topCountries}
            selected={selectedCountries}
            onToggle={toggleCountry}
            onClear={clearCountries}
          />
        )}
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border-card bg-tertiary-bg px-3 py-2">
          <span className="text-xs font-medium text-primary-text">Hide Joined Servers</span>
          <Switch checked={hideJoinedServers} onCheckedChange={setHideJoinedServers} />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-quaternary-text">Types</span>
          {selectedTypes.size > 0 && (
            <button
              type="button"
              onClick={clearTypes}
              className="text-[10px] font-semibold text-link hover:text-link-hover"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 px-2 pb-1">
          {ROBBERY_TYPES.map((type) => {
            const active = selectedTypes.has(type.markerName)
            const count = typeCounts.get(type.markerName) ?? 0
            return (
              <button
                key={type.markerName}
                type="button"
                onClick={() => toggleType(type.markerName)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${active
                    ? 'border-button-info/40 bg-button-info/20 text-primary-text'
                    : 'border-border-card bg-tertiary-bg text-secondary-text hover:bg-quaternary-bg'
                  }`}
              >
                {type.name}
                <span className="tabular-nums text-tertiary-text">{count}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const SERVER_SIZE_OPTIONS: readonly { value: ServerSizeFilter; label: string }[] = [
  { value: 'all', label: 'All Server Sizes' },
  { value: 'big', label: 'Big Servers (9+ Players)' },
  { value: 'small', label: 'Small Servers (0-8 Players)' }
]

const TIME_SORT_OPTIONS: readonly { value: TimeSort; label: string }[] = [
  { value: 'newest', label: 'Logged (Newest to Oldest)' },
  { value: 'oldest', label: 'Logged (Oldest to Newest)' }
]
