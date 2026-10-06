import { useMemo } from 'react'
import { SearchInput } from '@renderer/components/ui/search-input'
import { Switch } from '@renderer/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { CountryFilterMenu, FilterMenu } from '@renderer/components/tracker/FilterMenus'
import { SectionHeader, SidebarHeader } from '@renderer/components/tracker/SidebarParts'
import { BackgroundAlertsNotice, BellIcon, DesktopAlertsHint } from '@renderer/components/tracker/TrackerAlertsSection'
import { useRobberyTracker } from '@renderer/contexts/RobberyTrackerContext'
import { ROBBERY_TYPES, robberyImageUrl } from '@renderer/lib/robberyUtils'
import { updateTrackerAlerts, useTrackerAlerts } from '@renderer/lib/trackerAlerts'
import type { ServerSizeFilter, TimeSort } from '@renderer/hooks/useRobberyFilters'

function RobberyTypeRow({
  name,
  markerName,
  count,
  selected,
  alerting,
  onToggle,
  onToggleAlert
}: {
  name: string
  markerName: string
  count: number
  selected: boolean
  alerting: boolean
  onToggle: () => void
  onToggleAlert: () => void
}): React.JSX.Element {
  return (
    <div
      className={`group flex items-center gap-2 rounded-lg border px-1.5 py-1 transition-colors ${selected
        ? 'border-button-info bg-button-info/15'
        : 'border-transparent hover:bg-quaternary-bg'
        }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={`flex min-w-0 flex-1 items-center gap-2 text-left ${count === 0 && !selected ? 'opacity-50' : ''}`}
      >
        <img
          src={robberyImageUrl(markerName)}
          alt=""
          draggable={false}
          className="h-7 w-10 shrink-0 rounded object-cover"
        />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-primary-text">{name}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${count > 0 ? 'bg-status-success/20 text-status-success' : 'bg-quaternary-bg text-tertiary-text'
                }`}
            >
              {count}
            </span>
          </TooltipTrigger>
          <TooltipContent>{count === 0 ? 'None open right now' : `${count} open right now`}</TooltipContent>
        </Tooltip>
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggleAlert}
            aria-pressed={alerting}
            aria-label={alerting ? `Stop alerts for ${name}` : `Alert me when ${name} opens`}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${alerting
              ? 'bg-button-info/20 text-link'
              : 'text-quaternary-text opacity-0 group-hover:opacity-100 hover:bg-quaternary-bg hover:text-primary-text focus-visible:opacity-100'
              }`}
          >
            <BellIcon className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{alerting ? `Alerts on for ${name}. Click to turn off` : `Alert me when ${name} opens`}</TooltipContent>
      </Tooltip>
    </div>
  )
}

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
  const { robberyTypes: alertTypes } = useTrackerAlerts()
  const alerting = new Set(alertTypes)

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

  const activeCount = selectedTypes.size + selectedCountries.size + (serverSize !== 'all' ? 1 : 0)
  const clearAll = (): void => {
    clearTypes()
    clearCountries()
    setServerSize('all')
  }

  const toggleAlert = (markerName: string): void => {
    updateTrackerAlerts({
      robberyTypes: alerting.has(markerName)
        ? alertTypes.filter((t) => t !== markerName)
        : [...alertTypes, markerName]
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <SidebarHeader title="Filters" activeCount={activeCount} onClearAll={clearAll} />

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

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-border-primary px-2 pt-3 pb-2">
        <SectionHeader
          label="Robberies"
          hint={alertTypes.length > 0 ? `${alertTypes.length} alert${alertTypes.length === 1 ? '' : 's'} on` : 'Bell for alerts'}
          onClear={selectedTypes.size > 0 ? clearTypes : undefined}
        />
        <div className="space-y-0.5">
          {ROBBERY_TYPES.map((type) => (
            <RobberyTypeRow
              key={type.markerName}
              name={type.name}
              markerName={type.markerName}
              count={typeCounts.get(type.markerName) ?? 0}
              selected={selectedTypes.has(type.markerName)}
              alerting={alerting.has(type.markerName)}
              onToggle={() => toggleType(type.markerName)}
              onToggleAlert={() => toggleAlert(type.markerName)}
            />
          ))}
        </div>
        <DesktopAlertsHint show={alertTypes.length > 0} />
      </div>
      <BackgroundAlertsNotice />
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
