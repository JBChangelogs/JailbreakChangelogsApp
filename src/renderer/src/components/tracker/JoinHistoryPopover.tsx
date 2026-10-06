import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useRelativeTime } from '@renderer/hooks/useRelativeTime'
import type { JoinHistoryEntry } from '@renderer/hooks/useJoinHistory'

function HistoryIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.05 11a9 9 0 1 1 .5 4M3 4v5h5" />
    </svg>
  )
}

function HistoryRow({ entry }: { entry: JoinHistoryEntry }): React.JSX.Element {
  const relativeTime = useRelativeTime(entry.joinedAt)

  return (
    <div className="rounded-lg px-2.5 py-1.5 hover:bg-quaternary-bg">
      <p className="truncate text-[13px] font-medium text-primary-text">{entry.displayName}</p>
      <p className="text-[11px] text-tertiary-text">Joined {relativeTime ?? 'just now'}</p>
    </div>
  )
}

interface JoinHistoryPopoverProps {
  history: JoinHistoryEntry[]
  totalJoined: number
  loading: boolean
  totalLabel: string
  emptyLabel: string
}

export function JoinHistoryPopover({
  history,
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
      <PopoverContent align="end" className="w-72 p-1">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-quaternary-text">Join History</span>
        </div>
        {totalJoined > 0 && (
          <div className="mx-1 mb-1 flex items-center justify-between rounded-md bg-tertiary-bg px-2.5 py-2">
            <span className="text-xs text-secondary-text">{totalLabel}</span>
            <span className="text-sm font-bold text-primary-text">{totalJoined}</span>
          </div>
        )}
        {loading && history.length === 0 ? (
          <p className="px-2.5 py-4 text-center text-xs text-quaternary-text">Loading…</p>
        ) : history.length === 0 ? (
          <p className="px-2.5 py-4 text-center text-xs text-quaternary-text">{emptyLabel}</p>
        ) : (
          <div className="max-h-80 space-y-0.5 overflow-y-auto">
            {history.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
