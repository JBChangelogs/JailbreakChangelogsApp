import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useRelativeTime } from '@renderer/hooks/useRelativeTime'
import { useRobberyTracker } from '@renderer/contexts/RobberyTrackerContext'
import { InlineTeamPlayers } from '@renderer/components/robbery/InlineTeamPlayers'
import { ServerRoster } from '@renderer/components/tracker/ServerRoster'
import {
  buildRobloxServerDeepLink,
  formatServerTime,
  isValidCasinoCode,
  robberyImageUrl,
  robberyMarkerToDisplayName
} from '@renderer/lib/robberyUtils'
import type { RobberyData } from '@shared/robbery'
import { track } from '@renderer/lib/analytics'

function ClockIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function MapPinIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
      />
    </svg>
  )
}

function ClipboardIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3a2.25 2.25 0 0 0-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
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

function HourglassIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3h10.5M6.75 21h10.5M7.5 3v3.5a4.5 4.5 0 0 0 2.03 3.76L12 12l2.47 1.74A4.5 4.5 0 0 1 16.5 17.5V21M16.5 3v3.5a4.5 4.5 0 0 1-2.03 3.76L12 12l-2.47 1.74A4.5 4.5 0 0 0 7.5 17.5V21"
      />
    </svg>
  )
}

function isTrainNearClose(robbery: RobberyData): boolean {
  return (
    (robbery.marker_name === 'TrainPassenger' || robbery.marker_name === 'TrainCargo') &&
    robbery.progress !== null &&
    robbery.progress > 0.6
  )
}

const badgeBase =
  'inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-medium leading-none'

function StatusBadge({ robbery, planeCountdown }: { robbery: RobberyData; planeCountdown: string | null }): React.JSX.Element {
  if (isTrainNearClose(robbery)) {
    return <div className={`${badgeBase} border-white/40 bg-status-warning text-white shadow-md ring-1 ring-black/20`}>Ends Soon</div>
  }

  if (robbery.marker_name === 'Mansion') {
    if (robbery.status === 1) {
      return <div className={`${badgeBase} border-white/40 bg-status-success text-white shadow-md ring-1 ring-black/20`}>Open</div>
    }
    if (robbery.status === 2) {
      return (
          <div className={`${badgeBase} border-white/40 bg-status-success text-white shadow-md ring-1 ring-black/20`}>
          Ready to Open
        </div>
      )
    }
    return <div className={`${badgeBase} border-border-card bg-tertiary-bg text-secondary-text`}>Unknown</div>
  }

  switch (robbery.status) {
    case 1:
      if (robbery.marker_name === 'CargoPlane' && planeCountdown) {
        return (
          <div className={`${badgeBase} border-white/40 bg-status-warning text-white shadow-md ring-1 ring-black/20`}>
            {planeCountdown.includes('Departed') ? planeCountdown : `Departs in ${planeCountdown}`}
          </div>
        )
      }
      return <div className={`${badgeBase} border-white/40 bg-status-success text-white shadow-md ring-1 ring-black/20`}>Open</div>
    case 2:
      return <div className={`${badgeBase} border-white/40 bg-status-warning text-white shadow-md ring-1 ring-black/20`}>Active</div>
    case 3:
      return <div className={`${badgeBase} border-border-card bg-tertiary-bg text-secondary-text`}>Completed</div>
    default:
      return <div className={`${badgeBase} border-border-card bg-tertiary-bg text-secondary-text`}>Unknown</div>
  }
}

export function RobberyCard({ robbery }: { robbery: RobberyData }): React.JSX.Element {
  const [isJoining, setIsJoining] = useState(false)
  const [planeCountdown, setPlaneCountdown] = useState<string | null>(null)
  const [casinoCountdown, setCasinoCountdown] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { addJoinHistoryEntry, getRegionData, getRoster, markJoined, isJoined } = useRobberyTracker()

  const displayName = robberyMarkerToDisplayName(robbery.marker_name, robbery.name)
  const imageUrl = robberyImageUrl(robbery.marker_name)
  const jobId = robbery.server?.job_id || robbery.job_id
  const relativeTime = useRelativeTime(robbery.timestamp)
  const alreadyJoined = jobId ? isJoined(jobId) : false

  const regionId = robbery.region_id || jobId
  const regionData = robbery.region_data ?? (regionId ? getRegionData(regionId) : undefined)

  useEffect(() => {
    if (robbery.marker_name !== 'CargoPlane' || !robbery.metadata?.plane_time) return undefined
    const planeTime = robbery.metadata.plane_time

    const update = (): void => {
      const diff = planeTime - Math.floor(Date.now() / 1000)
      const abs = Math.abs(diff)
      const hours = Math.floor(abs / 3600)
      const minutes = Math.floor((abs % 3600) / 60)
      const seconds = abs % 60
      const parts = hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
      setPlaneCountdown(diff > 0 ? parts : `Departed ${parts} ago`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [robbery.marker_name, robbery.metadata])

  useEffect(() => {
    if (robbery.marker_name !== 'Casino' || robbery.status !== 2 || !robbery.metadata?.casino_time) return undefined
    const casinoTime = robbery.metadata.casino_time

    const update = (): void => {
      const diff = Math.max(0, casinoTime - Math.floor(Date.now() / 1000))
      const minutes = Math.floor(diff / 60)
      const seconds = diff % 60
      setCasinoCountdown(minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [robbery.marker_name, robbery.status, robbery.metadata])

  const handleCopyCasinoCode = (code: string): void => {
    void navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const players = robbery.server?.players ?? []
  const showCasinoExtras =
    robbery.metadata?.casino_code ||
    (robbery.marker_name === 'Casino' && robbery.status === 2 && robbery.metadata?.casino_time && casinoCountdown)

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border-2 border-border-card bg-secondary-bg transition-all duration-300 hover:shadow-lg">
      <div className="relative w-full overflow-hidden bg-tertiary-bg" style={{ aspectRatio: '16 / 9' }}>
        <img src={imageUrl} alt={displayName} className="h-full w-full object-cover" draggable={false} />
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {alreadyJoined && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-white/40 bg-status-success text-white shadow-md ring-1 ring-black/20">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>You've already joined this server</TooltipContent>
            </Tooltip>
          )}
          <StatusBadge robbery={robbery} planeCountdown={planeCountdown} />
        </div>
      </div>

      <div className="flex w-full flex-1 flex-col gap-1.5 p-2.5">
        <div className="flex items-start justify-between gap-1.5">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-primary-text">{displayName}</h3>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-secondary-text">
          <ClockIcon className="h-4 w-4 shrink-0" />
          <span className="font-mono tabular-nums text-primary-text">{formatServerTime(robbery.server_time)}</span>
        </div>

        <InlineTeamPlayers players={players} />
        {jobId && <ServerRoster roster={getRoster(jobId)} />}

        <div className="flex items-center gap-1.5 text-xs text-secondary-text">
          <MapPinIcon className="h-4 w-4 shrink-0" />
          <span className="truncate font-medium text-primary-text">
            {regionData
              ? `${regionData.city}, ${regionData.regionName}, ${regionData.country}`
              : 'Loading region…'}
          </span>
        </div>

        {showCasinoExtras && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {robbery.metadata?.casino_code &&
              (isValidCasinoCode(robbery.metadata.casino_code) ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleCopyCasinoCode(robbery.metadata!.casino_code!)}
                      className="group inline-flex h-6 cursor-pointer items-center gap-1 rounded-md border border-button-info/30 bg-button-info/20 px-2 font-mono text-[11px] font-medium leading-none text-primary-text transition-colors hover:bg-button-info/30"
                    >
                      {copied ? 'Copied!' : `Code: ${robbery.metadata.casino_code}`}
                      <ClipboardIcon className="h-3.5 w-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Click to copy code</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex h-6 cursor-help items-center gap-1 rounded-md border border-border-card bg-tertiary-bg px-2 font-mono text-[11px] font-medium leading-none text-primary-text">
                      Code: ???
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Code not available due to a {displayName} rendering issue</TooltipContent>
                </Tooltip>
              ))}

            {robbery.marker_name === 'Casino' &&
              robbery.status === 2 &&
              robbery.metadata?.casino_time &&
              casinoCountdown && (
                <span className="inline-flex items-center gap-1 text-secondary-text">
                  <HourglassIcon className="h-3.5 w-3.5" />
                  <span>
                    Closes in{' '}
                    <span className="font-mono font-semibold tabular-nums text-primary-text">{casinoCountdown}</span>
                  </span>
                </span>
              )}
          </div>
        )}

        {jobId && (
          <div className="mt-auto flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="default"
              className="h-7! flex-1 min-w-0 px-2.5! text-xs!"
              disabled={isJoining}
              onClick={() => {
                setIsJoining(true)
                addJoinHistoryEntry({ markerName: robbery.marker_name, displayName, serverId: jobId })
                markJoined(jobId)
                track('server_join_click', { source: 'tracker' })
                window.api.openExternal(buildRobloxServerDeepLink(jobId))
                setTimeout(() => setIsJoining(false), 5000)
              }}
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
              {isJoining ? 'Joining…' : 'Join'}
            </Button>
            <span className="shrink-0 text-[11px] tabular-nums text-tertiary-text">{relativeTime ?? 'just now'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
