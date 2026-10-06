import { useEffect, useMemo, useRef, useState } from 'react'
import { useUptimeMonitor } from '@renderer/hooks/useUptimeMonitor'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import type { UptimeHeartbeat } from '@shared/uptimeStatus'

const MONITOR_NAME = 'Robbery Tracking Bots'
const MAX_BEATS = 50
const BAR_HEIGHT = 14
const BAR_GAP = 2

const STATUS_COLOR: Record<number, string> = {
  0: '#dc3545',
  1: '#28a745',
  2: '#ffc107',
  3: '#1747f5'
}
const EMPTY_COLOR = '#d4d4d4'

function badgeClassName(uptime24h: number | null): string {
  if (uptime24h == null) return 'bg-status-neutral'
  if (uptime24h >= 0.98) return 'bg-status-success-vibrant'
  if (uptime24h >= 0.9) return 'bg-status-warning'
  return 'bg-status-error'
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
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

function HeartbeatBar({ heartbeats }: { heartbeats: UptimeHeartbeat[] }): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(600)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const padded = useMemo<(UptimeHeartbeat | null)[]>(
    () => Array(Math.max(0, MAX_BEATS - heartbeats.length)).fill(null).concat(heartbeats.slice(-MAX_BEATS)),
    [heartbeats]
  )
  const barWidth = width > 0 ? (width - BAR_GAP * (MAX_BEATS - 1)) / MAX_BEATS : 0

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width <= 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(BAR_HEIGHT * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${BAR_HEIGHT}px`
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, BAR_HEIGHT)

    padded.forEach((beat, i) => {
      const x = i * (barWidth + BAR_GAP)
      const w = Math.min(barWidth, width - x)
      ctx.fillStyle = beat ? (STATUS_COLOR[beat.status] ?? EMPTY_COLOR) : EMPTY_COLOR
      roundRect(ctx, x, 0, w, BAR_HEIGHT, 2)
      ctx.fill()
    })
  }, [padded, barWidth, width])

  return (
    <div ref={wrapRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Heartbeat history: ${heartbeats.length} checks`}
      />
      {barWidth > 0 && (
        <div className="absolute inset-0 flex" style={{ gap: BAR_GAP }}>
          {padded.map((beat, i) =>
            beat ? (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <div style={{ width: barWidth }} />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-semibold">{beat.ping != null ? `${beat.ping}ms` : 'No ping data'}</p>
                  <p className="text-quaternary-text">{formatHeartbeatTime(beat.time)}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div key={i} style={{ width: barWidth }} />
            )
          )}
        </div>
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
          <div className="h-3.5 w-full animate-pulse rounded bg-quaternary-bg" />
        ) : (
          <HeartbeatBar heartbeats={heartbeats} />
        )}
      </div>
    </div>
  )
}
