import { useEffect, useState } from 'react'
import { RobloxAvatar } from '@renderer/components/dupefinder/RobloxAvatar'
import { itemDetailApi } from '@renderer/lib/itemDetailApi'
import { userDisplay, userHandle } from '@renderer/lib/dupeDisplay'
import { dupesApi } from '@renderer/lib/dupesApi'
import type { ItemHoarder } from '@shared/itemDetail'
import type { RobloxUserSummary } from '@shared/dupe'

export function ItemHoardersTab({ itemName, itemType }: { itemName: string; itemType: string }): React.JSX.Element {
  const [hoarders, setHoarders] = useState<ItemHoarder[] | null>(null)
  const [profiles, setProfiles] = useState<Record<string, RobloxUserSummary>>({})
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setHoarders(null)
    setError(false)
    itemDetailApi
      .hoarders(itemName, itemType)
      .then((result) => {
        if (cancelled) return
        setHoarders(result)
        const ids = result.map((h) => h.user_id)
        if (ids.length > 0) {
          dupesApi
            .fetchUsersBatch(ids)
            .then((batch) => !cancelled && setProfiles(batch))
            .catch(() => {})
        }
      })
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [itemName, itemType])

  if (error) return <p className="py-8 text-center text-sm text-status-error">Failed to load hoarders.</p>
  if (!hoarders) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
      </div>
    )
  }
  if (hoarders.length === 0) {
    return <p className="py-8 text-center text-sm text-quaternary-text">No hoarder data recorded for this item.</p>
  }

  return (
    <div className="divide-y divide-border-card overflow-hidden rounded-2xl border border-border-card bg-secondary-bg">
      {hoarders.map((hoarder, index) => {
        const user = profiles[hoarder.user_id]
        return (
          <a
            key={hoarder.user_id}
            href={`https://www.roblox.com/users/${hoarder.user_id}/profile`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-tertiary-bg"
          >
            <span className="w-6 shrink-0 text-center text-sm font-bold text-tertiary-text">#{index + 1}</span>
            <RobloxAvatar userId={hoarder.user_id} label={userDisplay(user, hoarder.user_id)} className="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-primary-text">{userDisplay(user, hoarder.user_id)}</p>
              <p className="truncate text-xs text-secondary-text">@{userHandle(user, hoarder.user_id)}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-primary-text">{hoarder.count.toLocaleString()}</span>
          </a>
        )
      })}
    </div>
  )
}
