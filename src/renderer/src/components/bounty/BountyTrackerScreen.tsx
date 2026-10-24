import { useMemo } from 'react'
import { useBountyTracker } from '@renderer/contexts/BountyTrackerContext'
import { BOUNTY_RANGE_MAX } from '@renderer/hooks/useBountyFilters'
import { ServerBountyGroup } from '@renderer/components/bounty/ServerBountyGroup'
import { JoinHistoryPopover } from '@renderer/components/tracker/JoinHistoryPopover'
import { UptimeStatusBanner } from '@renderer/components/tracker/UptimeStatusBanner'
import { TrackerViewSwitcher, type TrackerView } from '@renderer/components/tracker/TrackerViewSwitcher'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { TrackerStatusBanner, trackerProblem } from '@renderer/components/tracker/trackerStatus'

export function BountyTrackerScreen({
  trackerView,
  onChangeView
}: {
  trackerView: TrackerView
  onChangeView: (view: TrackerView) => void
}): React.JSX.Element {
  const {
    serverGroups,
    isConnecting,
    error,
    requiresManualReconnect,
    isBanned,
    banRemainingSeconds,
    reconnect,
    reconnectFromBan,
    searchQuery,
    selectedCountries,
    minBounty,
    maxBounty,
    joinHistory,
    totalJoined,
    joinHistoryLoading
  } = useBountyTracker()

  const problem = trackerProblem({
    isBanned,
    banRemainingSeconds,
    requiresManualReconnect,
    error,
    isConnecting,
    reconnect,
    reconnectFromBan
  })
  const filtersActive = searchQuery !== '' || selectedCountries.size > 0 || minBounty !== 0 || maxBounty !== BOUNTY_RANGE_MAX

  const totalBounties = useMemo(
    () => serverGroups.reduce((sum, group) => sum + group.bounties.length, 0),
    [serverGroups]
  )

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex h-[53px] shrink-0 items-center gap-4 border-b border-border-primary px-5">
        <TrackerViewSwitcher value={trackerView} onChange={onChangeView} />
        <UptimeStatusBanner />
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-tertiary-text">{totalBounties} shown</span>
          <JoinHistoryPopover
            counts={joinHistory}
            markerLabel={() => 'Bounty servers'}
            totalJoined={totalJoined}
            loading={joinHistoryLoading}
            totalLabel="Total bounty servers joined"
            emptyLabel="You haven't joined any bounty servers yet."
          />
        </div>
      </div>

      {problem && serverGroups.length > 0 && <TrackerStatusBanner status={problem} />}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {serverGroups.length === 0 ? (
          <EmptyState
            status={
              problem ??
              (filtersActive
                ? {
                  icon: 'funnel',
                  tone: 'neutral',
                  title: 'No bounties match your filters',
                  description: 'Try removing some filters in the sidebar.'
                }
                : {
                  icon: 'signal',
                  tone: 'neutral',
                  title: 'No bounties right now',
                  description: 'Servers with bounties show up here as soon as the tracker spots one. This page updates live.'
                })
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {serverGroups.map((group) => (
              <ServerBountyGroup key={group.serverId} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
