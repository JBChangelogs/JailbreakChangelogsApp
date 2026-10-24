import { useState } from 'react'
import { VirtualGrid } from '@renderer/components/ui/virtual-grid'
import { useRobberyTracker } from '@renderer/contexts/RobberyTrackerContext'
import { RobberyCard } from '@renderer/components/robbery/RobberyCard'
import { ROBBERY_TYPES, robberyImageUrl } from '@renderer/lib/robberyUtils'
import { JoinHistoryPopover } from '@renderer/components/tracker/JoinHistoryPopover'
import { UptimeStatusBanner } from '@renderer/components/tracker/UptimeStatusBanner'
import { TrackerViewSwitcher, type TrackerView } from '@renderer/components/tracker/TrackerViewSwitcher'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { TrackerStatusBanner, trackerProblem } from '@renderer/components/tracker/trackerStatus'

export function RobberyTrackerScreen({
  trackerView,
  onChangeView
}: {
  trackerView: TrackerView
  onChangeView: (view: TrackerView) => void
}): React.JSX.Element {
  const {
    robberies,
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
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)
  const problem = trackerProblem({
    isBanned,
    banRemainingSeconds,
    requiresManualReconnect,
    error,
    isConnecting,
    reconnect,
    reconnectFromBan
  })

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex h-[53px] shrink-0 items-center gap-4 border-b border-border-primary px-5">
        <TrackerViewSwitcher value={trackerView} onChange={onChangeView} />
        <UptimeStatusBanner />
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-tertiary-text">{filteredRobberies.length} shown</span>
          <JoinHistoryPopover
            counts={joinHistory}
            markerLabel={(markerName) => ROBBERY_TYPES.find((type) => type.markerName === markerName)?.name ?? markerName}
            markerImage={robberyImageUrl}
            lastLabel="Last robbed"
            totalJoined={totalJoined}
            loading={joinHistoryLoading}
            totalLabel="Total robberies joined"
            emptyLabel="You haven't joined any robberies yet."
          />
        </div>
      </div>

      {problem && filteredRobberies.length > 0 && <TrackerStatusBanner status={problem} />}

      <div ref={setScrollElement} className="min-h-0 flex-1 overflow-y-auto p-4">
        {filteredRobberies.length === 0 ? (
          <EmptyState
            status={
              problem ??
              (robberies.length === 0
                ? {
                  icon: 'signal',
                  tone: 'neutral',
                  title: 'No robberies right now',
                  description: 'Robberies show up here as soon as the tracker spots one. This page updates live.'
                }
                : {
                  icon: 'funnel',
                  tone: 'neutral',
                  title: 'No robberies match your filters',
                  description: `${robberies.length} ${robberies.length === 1 ? 'robbery is' : 'robberies are'} hidden. Try removing some filters in the sidebar.`
                })
            }
          />
        ) : (
          <VirtualGrid
            items={filteredRobberies}
            getKey={(robbery) => `${robbery.marker_name}-${robbery.job_id}-${robbery.timestamp}`}
            renderItem={(robbery, columns) => <RobberyCard robbery={robbery} compact={columns === 1} />}
            scrollElement={scrollElement}
            minColumnWidth={280}
            maxColumnWidth={380}
            estimateRowHeight={340}
          />
        )}
      </div>
    </div>
  )
}
