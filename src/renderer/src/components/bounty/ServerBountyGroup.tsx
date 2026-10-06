import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useRelativeTime } from '@renderer/hooks/useRelativeTime'
import { useBountyTracker } from '@renderer/contexts/BountyTrackerContext'
import { InlineTeamPlayers } from '@renderer/components/robbery/InlineTeamPlayers'
import { ServerRoster } from '@renderer/components/tracker/ServerRoster'
import { BountyCard } from '@renderer/components/bounty/BountyCard'
import { buildRobloxServerDeepLink, formatServerTime } from '@renderer/lib/robberyUtils'
import type { BountyServerGroup as BountyServerGroupData } from '@renderer/contexts/BountyTrackerContext'

function DollarIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m3-9.75c0-1.036-1.343-1.875-3-1.875s-3 .84-3 1.875.343.375 3 1.875 3 .84 3 1.875-1.343 1.875-3 1.875-3-.84-3-1.875"
      />
    </svg>
  )
}

function MapPinIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  )
}

function ExternalLinkIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
    </svg>
  )
}

export function ServerBountyGroup({ group }: { group: BountyServerGroupData }): React.JSX.Element {
  const [isJoining, setIsJoining] = useState(false)
  const { addJoinHistoryEntry, getRegionData, getRoster, markJoined, isJoined } = useBountyTracker()

  const jobId = group.serverId
  const players = group.bounties[0]?.server?.players ?? []
  const serverTime = group.bounties[0]?.server_time
  const relativeTime = useRelativeTime(group.lastUpdated)
  const alreadyJoined = jobId ? isJoined(jobId) : false
  const regionData = jobId ? getRegionData(jobId) : undefined

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border-card">
      <div className="flex flex-col gap-3 border-b border-border-card bg-tertiary-bg p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase tracking-wider text-secondary-text">
                Total Server Bounty
              </span>
              <div className="flex items-center gap-1.5">
                <DollarIcon className="h-6 w-6 text-status-warning" />
                <span className="text-2xl font-bold text-status-warning">
                  {group.totalBounty.toLocaleString()}
                </span>
              </div>
            </div>

            <span className="hidden text-2xl font-light text-tertiary-text sm:inline">|</span>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-secondary-text">
                {group.bounties.length} {group.bounties.length === 1 ? 'Bounty' : 'Bounties'}
              </span>
              <InlineTeamPlayers players={players} />
              {jobId && <ServerRoster roster={getRoster(jobId)} />}
              {alreadyJoined && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-status-success-vibrant/15 text-status-success-vibrant">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>You've already joined this server</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:items-end">
          {jobId && (
            <Button
              size="sm"
              variant="default"
              disabled={isJoining}
              onClick={() => {
                setIsJoining(true)
                addJoinHistoryEntry({
                  markerName: 'Bounty',
                  displayName: `Bounty server (${group.bounties.length})`,
                  serverId: jobId
                })
                markJoined(jobId)
                window.api.openExternal(buildRobloxServerDeepLink(jobId))
                setTimeout(() => setIsJoining(false), 5000)
              }}
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
              {isJoining ? 'Joining…' : 'Join Server'}
            </Button>
          )}

          <div className="flex items-center gap-1.5 text-sm text-secondary-text">
            <MapPinIcon className="h-4 w-4" />
            <span>
              {regionData ? `${regionData.city}, ${regionData.regionName}, ${regionData.country}` : 'Loading region…'}
            </span>
          </div>

          {serverTime != null && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-secondary-text">Server Time:</span>
              <span className="font-mono font-medium text-primary-text">{formatServerTime(serverTime)}</span>
            </div>
          )}

          <span className="text-xs text-secondary-text">Logged {relativeTime ?? 'just now'}</span>
        </div>
      </div>

      <div className="bg-secondary-bg p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {group.bounties.map((bounty) => (
            <BountyCard key={`${bounty.userid}-${bounty.timestamp}`} bounty={bounty} />
          ))}
        </div>
      </div>
    </div>
  )
}
