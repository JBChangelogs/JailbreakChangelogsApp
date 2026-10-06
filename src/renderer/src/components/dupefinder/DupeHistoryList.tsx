import { RobloxAvatar } from '@renderer/components/dupefinder/RobloxAvatar'
import { userDisplay } from '@renderer/lib/dupeDisplay'
import type { DupeFinderHistoryEntry, RobloxUserSummary } from '@shared/dupe'

function formatTradeTime(timestamp: number): string {
  const ms = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DupeHistoryList({
  history,
  ownerProfiles
}: {
  history: DupeFinderHistoryEntry[]
  ownerProfiles: Record<string, RobloxUserSummary>
}): React.JSX.Element {
  const sorted = [...history].sort((a, b) => b.TradeTime - a.TradeTime)

  if (sorted.length === 0) {
    return <p className="px-1 text-xs text-quaternary-text">No ownership history recorded.</p>
  }

  return (
    <div className="space-y-1.5">
      {sorted.map((entry, index) => {
        const id = String(entry.UserId)
        const user = ownerProfiles[id]
        return (
          <div key={`${id}-${entry.TradeTime}-${index}`} className="flex items-center gap-2 rounded-md border border-border-card bg-tertiary-bg p-2">
            <RobloxAvatar userId={id} label={userDisplay(user, id)} className="h-7 w-7" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-primary-text">{userDisplay(user, id)}</p>
              <p className="text-[10px] text-secondary-text">{formatTradeTime(entry.TradeTime)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
