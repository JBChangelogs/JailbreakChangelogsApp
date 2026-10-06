import { useEffect, useState } from 'react'
import { SearchInput } from '@renderer/components/ui/search-input'
import { Switch } from '@renderer/components/ui/switch'
import { CountryFilterMenu } from '@renderer/components/tracker/FilterMenus'
import { useBountyTracker } from '@renderer/contexts/BountyTrackerContext'
import { BOUNTY_RANGE_MAX } from '@renderer/hooks/useBountyFilters'

export function BountySidebarFilters(): React.JSX.Element {
  const {
    searchQuery,
    setSearchQuery,
    selectedCountries,
    toggleCountry,
    clearCountries,
    topCountries,
    minBounty,
    maxBounty,
    setBountyRange,
    hideJoinedServers,
    setHideJoinedServers
  } = useBountyTracker()

  const [minInput, setMinInput] = useState(String(minBounty))
  const [maxInput, setMaxInput] = useState(String(maxBounty))

  useEffect(() => setMinInput(String(minBounty)), [minBounty])
  useEffect(() => setMaxInput(String(maxBounty)), [maxBounty])

  const commitMin = (): void => {
    const value = Math.max(0, Math.min(Number(minInput) || 0, maxBounty))
    setBountyRange([value, maxBounty])
  }

  const commitMax = (): void => {
    const value = Math.max(minBounty, Math.min(Number(maxInput) || 0, BOUNTY_RANGE_MAX))
    setBountyRange([minBounty, value])
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="px-3 py-2.5">
        <h1 className="text-xs font-bold uppercase tracking-wide text-quaternary-text">Filters</h1>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search bounties..." />

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
        <div className="rounded-md border border-border-card bg-tertiary-bg p-2.5">
          <p className="mb-2 text-xs font-medium text-secondary-text">Total Server Bounty</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value.replace(/\D/g, ''))}
              onBlur={commitMin}
              placeholder="Min"
              className="h-7 w-full min-w-0 rounded border border-border-card bg-primary-bg px-2 text-[11px] text-primary-text focus:outline-none"
            />
            <span className="shrink-0 text-xs text-secondary-text">-</span>
            <input
              type="text"
              inputMode="numeric"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value.replace(/\D/g, ''))}
              onBlur={commitMax}
              placeholder="Max"
              className="h-7 w-full min-w-0 rounded border border-border-card bg-primary-bg px-2 text-[11px] text-primary-text focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
