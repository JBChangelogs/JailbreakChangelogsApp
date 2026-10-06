import { useMemo } from 'react'
import { Button } from '@renderer/components/ui/button'
import { useBountyTracker } from '@renderer/contexts/BountyTrackerContext'
import { ServerBountyGroup } from '@renderer/components/bounty/ServerBountyGroup'
import { JoinHistoryPopover } from '@renderer/components/tracker/JoinHistoryPopover'
import { UptimeStatusBanner } from '@renderer/components/tracker/UptimeStatusBanner'
import { TrackerViewSwitcher, type TrackerView } from '@renderer/components/tracker/TrackerViewSwitcher'

function StatusBanner({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'error' }): React.JSX.Element {
  return (
    <div
      className={`flex items-center justify-center gap-3 border-b border-border-primary px-4 py-2 text-sm ${tone === 'error' ? 'bg-status-error/10 text-status-error' : 'bg-tertiary-bg text-secondary-text'
        }`}
    >
      {children}
    </div>
  )
}

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
    joinHistory,
    totalJoined,
    joinHistoryLoading
  } = useBountyTracker()

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
            history={joinHistory}
            totalJoined={totalJoined}
            loading={joinHistoryLoading}
            totalLabel="Total bounty servers joined"
            emptyLabel="You haven't joined any bounty servers yet."
          />
        </div>
      </div>

      {isBanned && (
        <StatusBanner tone="error">
          You&apos;ve been temporarily banned from the tracker
          {banRemainingSeconds != null ? ` (${Math.ceil(banRemainingSeconds / 60)}m remaining)` : ''}.
          <Button size="sm" variant="ghost" onClick={reconnectFromBan}>
            Try again
          </Button>
        </StatusBanner>
      )}

      {!isBanned && requiresManualReconnect && (
        <StatusBanner tone="error">
          Connected from another device or tab.
          <Button size="sm" variant="ghost" onClick={reconnect}>
            Reconnect here
          </Button>
        </StatusBanner>
      )}

      {!isBanned && !requiresManualReconnect && error && (
        <StatusBanner tone="error">
          {error}
          <Button size="sm" variant="ghost" onClick={reconnect}>
            Retry
          </Button>
        </StatusBanner>
      )}

      {!isBanned && !requiresManualReconnect && !error && isConnecting && (
        <StatusBanner>Connecting to the tracker…</StatusBanner>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {serverGroups.length === 0 ? (
          <p className="pt-10 text-center text-sm text-quaternary-text">No bounties match the current filters.</p>
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
