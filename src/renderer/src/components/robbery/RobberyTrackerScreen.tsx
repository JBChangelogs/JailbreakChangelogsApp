import { Button } from '@renderer/components/ui/button'
import { useRobberyTracker } from '@renderer/contexts/RobberyTrackerContext'
import { RobberyCard } from '@renderer/components/robbery/RobberyCard'
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

export function RobberyTrackerScreen({
  trackerView,
  onChangeView
}: {
  trackerView: TrackerView
  onChangeView: (view: TrackerView) => void
}): React.JSX.Element {
  const {
    filteredRobberies,
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
  } = useRobberyTracker()

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-4 border-b border-border-primary px-5 py-2">
        <TrackerViewSwitcher value={trackerView} onChange={onChangeView} />
        <UptimeStatusBanner />
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-tertiary-text">{filteredRobberies.length} shown</span>
          <JoinHistoryPopover
            history={joinHistory}
            totalJoined={totalJoined}
            loading={joinHistoryLoading}
            totalLabel="Total robberies joined"
            emptyLabel="You haven't joined any robberies yet."
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
        {filteredRobberies.length === 0 ? (
          <p className="pt-10 text-center text-sm text-quaternary-text">
            No robberies match the current filters.
          </p>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 320px))' }}
          >
            {filteredRobberies.map((robbery) => (
              <RobberyCard key={`${robbery.marker_name}-${robbery.job_id}-${robbery.timestamp}`} robbery={robbery} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
