import { useMemo } from 'react'
import { useUptimeMonitor } from '@renderer/hooks/useUptimeMonitor'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import type { UptimeHeartbeat } from '@shared/uptimeStatus'

const MONITOR_NAME = 'Robbery Tracking Bots'
const MAX_BEATS = 50

const STATUS_STYLE: Record<number, { className: string; label: string }> = {
  0: { className: 'bg-status-error', label: 'Down' },
  1: { className: 'bg-status-success', label: 'Up' },
  2: { className: 'bg-status-warning', label: 'Pending' },
  3: { className: 'bg-status-info', label: 'Maintenance' }
}

interface Run {
  status: number | null
  beats: UptimeHeartbeat[]
  count: number
}

function badgeClassName(uptime24h: number | null): string {
  if (uptime24h == null) return 'bg-status-neutral'
  if (uptime24h >= 0.98) return 'bg-status-success'
  if (uptime24h >= 0.9) return 'bg-status-warning'
  return 'bg-status-error'
}

function formatHeartbeatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  })
}

function toRuns(heartbeats: UptimeHeartbeat[]): Run[] {
  const beats = heartbeats.slice(-MAX_BEATS)
  const runs: Run[] = []
  const missing = MAX_BEATS - beats.length
  if (missing > 0) runs.push({ status: null, beats: [], count: missing })
  for (const beat of beats) {
    const last = runs[runs.length - 1]
    if (last && last.status === beat.status) {
      last.beats.push(beat)
      last.count++
    } else {
      runs.push({ status: beat.status, beats: [beat], count: 1 })
    }
  }
  return runs
}

function RunTooltip({ run }: { run: Run }): React.JSX.Element {
  const pings = run.beats.map((b) => b.ping).filter((p): p is number => p != null)
  const avgPing = pings.length ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : null
  const first = run.beats[0]
  const last = run.beats[run.beats.length - 1]
  return (
    <>
      <p className="font-semibold">
        {STATUS_STYLE[run.status ?? -1]?.label ?? 'Unknown'} · {run.count} {run.count === 1 ? 'check' : 'checks'}
      </p>
      <p className="text-secondary-text">{avgPing != null ? `${avgPing}ms average ping` : 'No ping data'}</p>
      <p className="text-quaternary-text">
        {formatHeartbeatTime(first.time)}
        {run.count > 1 && ` – ${formatHeartbeatTime(last.time)}`}
      </p>
    </>
  )
}

function HeartbeatBar({ heartbeats }: { heartbeats: UptimeHeartbeat[] }): React.JSX.Element {
  const runs = useMemo(() => toRuns(heartbeats), [heartbeats])

  return (
    <div
      role="img"
      aria-label={`Heartbeat history: ${heartbeats.length} checks`}
      className="flex h-2 w-full items-center gap-[3px]"
    >
      {runs.map((run, i) =>
        run.status == null ? (
          <div key={i} className="h-full min-w-2 rounded-full bg-quaternary-bg" style={{ flexGrow: run.count }} />
        ) : (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <div
                className={`h-full min-w-2 rounded-full transition-opacity hover:opacity-80 ${STATUS_STYLE[run.status]?.className ?? 'bg-quaternary-bg'}`}
                style={{ flexGrow: run.count }}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <RunTooltip run={run} />
            </TooltipContent>
          </Tooltip>
        )
      )}
    </div>
  )
}

export function UptimeStatusBanner(): React.JSX.Element {
  const { heartbeats, uptime24h, loading } = useUptimeMonitor(MONITOR_NAME)
  const showSkeleton = loading && heartbeats.length === 0

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div className="flex shrink-0 items-center gap-2">
        {showSkeleton ? (
          <span className="h-4 w-10 animate-pulse rounded-full bg-quaternary-bg" />
        ) : (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white ${badgeClassName(uptime24h)}`}
          >
            {uptime24h != null ? (uptime24h * 100).toFixed(2) : 'N/A'}%
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {showSkeleton ? (
          <div className="h-2 w-full animate-pulse rounded-full bg-quaternary-bg" />
        ) : (
          <HeartbeatBar heartbeats={heartbeats} />
        )}
      </div>
    </div>
  )
}
