import { useEffect, useState } from 'react'
import { SearchInput } from '@renderer/components/ui/search-input'
import { Switch } from '@renderer/components/ui/switch'
import { CountryFilterMenu } from '@renderer/components/tracker/FilterMenus'
import { SectionHeader, SidebarHeader } from '@renderer/components/tracker/SidebarParts'
import { BackgroundAlertsNotice, BountyAlertsSection } from '@renderer/components/tracker/TrackerAlertsSection'
import { useBountyTracker } from '@renderer/contexts/BountyTrackerContext'
import { BOUNTY_RANGE_MAX } from '@renderer/hooks/useBountyFilters'

const PRESETS: readonly { label: string; min: number }[] = [
  { label: 'Any', min: 0 },
  { label: '10k+', min: 10_000 },
  { label: '25k+', min: 25_000 },
  { label: '50k+', min: 50_000 },
  { label: '100k+', min: 100_000 }
]

const inputClass =
  'h-8 w-full min-w-0 rounded-md border border-border-card bg-primary-bg px-2 text-xs tabular-nums text-primary-text focus:border-button-info focus:outline-none'

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

  const rangeActive = minBounty !== 0 || maxBounty !== BOUNTY_RANGE_MAX
  const activeCount = selectedCountries.size + (rangeActive ? 1 : 0)
  const clearAll = (): void => {
    clearCountries()
    setBountyRange([0, BOUNTY_RANGE_MAX])
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <SidebarHeader title="Filters" activeCount={activeCount} onClearAll={clearAll} />

      <div className="flex flex-col gap-2 px-3 pb-3">
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-border-primary px-2 pt-3 pb-2">
        <SectionHeader
          label="Total Server Bounty"
          onClear={rangeActive ? () => setBountyRange([0, BOUNTY_RANGE_MAX]) : undefined}
        />
        <div className="px-1">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => {
              const active = minBounty === preset.min && maxBounty === BOUNTY_RANGE_MAX
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setBountyRange([preset.min, BOUNTY_RANGE_MAX])}
                  aria-pressed={active}
                  className={`inline-flex h-7 items-center rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${active
                    ? 'border-button-info bg-button-info/20 text-primary-text'
                    : 'border-border-card bg-tertiary-bg text-secondary-text hover:bg-quaternary-bg hover:text-primary-text'
                    }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-[10px] font-medium text-tertiary-text">Min</span>
              <input
                type="text"
                inputMode="numeric"
                value={minInput}
                onChange={(e) => setMinInput(e.target.value.replace(/\D/g, ''))}
                onBlur={commitMin}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className={inputClass}
              />
            </label>
            <span className="pb-2 text-xs text-tertiary-text">–</span>
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-[10px] font-medium text-tertiary-text">Max</span>
              <input
                type="text"
                inputMode="numeric"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value.replace(/\D/g, ''))}
                onBlur={commitMax}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className={inputClass}
              />
            </label>
          </div>
          <p className="mt-1.5 text-[11px] text-tertiary-text">
            Showing {minBounty.toLocaleString()} – {maxBounty.toLocaleString()}
          </p>
        </div>

        <BountyAlertsSection />
      </div>
      <BackgroundAlertsNotice />
    </div>
  )
}
