import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useRelativeTime } from '@renderer/hooks/useRelativeTime'
import type { JoinCount } from '@renderer/hooks/useJoinHistory'

function HistoryIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.05 11a9 9 0 1 1 .5 4M3 4v5h5" />
    </svg>
  )
}

function CountRow({
  count,
  label,
  image,
  lastLabel
}: {
  count: JoinCount
  label: string
  image?: string
  lastLabel: string
}): React.JSX.Element {
  const relativeTime = useRelativeTime(count.lastJoined)

  return (
    <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-quaternary-bg">
      {image && (
        <img src={image} alt="" draggable={false} className="aspect-video h-10 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-primary-text">{label}</p>
        <p className="text-[11px] text-tertiary-text">{lastLabel} {relativeTime ?? 'just now'}</p>
      </div>
      <span className="shrink-0 text-sm font-bold text-primary-text tabular-nums">{count.joins.toLocaleString()}</span>
    </div>
  )
}

interface JoinHistoryPopoverProps {
  counts: JoinCount[]
  markerLabel: (markerName: string) => string
  markerImage?: (markerName: string) => string
  lastLabel?: string
  totalJoined: number
  loading: boolean
  totalLabel: string
  emptyLabel: string
}

export function JoinHistoryPopover({
  counts,
  markerLabel,
  markerImage,
  lastLabel = 'Last joined',
  totalJoined,
  loading,
  totalLabel,
  emptyLabel
}: JoinHistoryPopoverProps): React.JSX.Element {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Join history"
              className="flex h-7 w-7 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
            >
              <HistoryIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Join history</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" collisionPadding={8} className="flex max-h-[min(var(--radix-popover-content-available-height),640px)] w-80 flex-col overflow-hidden p-0">
        <div className="flex shrink-0 items-center gap-3 border-b border-border-primary p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-button-info/15 text-button-info">
            <HistoryIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-secondary-text">{totalLabel}</p>
            <p className="text-xl leading-tight font-bold text-primary-text tabular-nums">{totalJoined.toLocaleString()}</p>
          </div>
        </div>
        {loading && counts.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-quaternary-text">Loading…</p>
        ) : counts.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-quaternary-text">{emptyLabel}</p>
        ) : (
          <div className="min-h-0 space-y-0.5 overflow-y-auto p-1">
            {counts.map((count) => (
              <CountRow
                key={count.markerName}
                count={count}
                label={markerLabel(count.markerName)}
                image={markerImage?.(count.markerName)}
                lastLabel={lastLabel}
              />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
