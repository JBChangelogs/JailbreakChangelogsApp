import { useEffect, useState } from 'react'
import { RobloxAvatar } from '@renderer/components/dupefinder/RobloxAvatar'
import { itemDetailApi } from '@renderer/lib/itemDetailApi'
import type { ItemDupedUser } from '@shared/itemDetail'

function VerifiedIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 1 2.6 2.2 3.4-.4 1 3.3 3.1 1.6-.9 3.3 1.9 2.9L21 16l.2 3.4-3.3.6-1.9 2.8-3.1-1.3L12 23l-2.9-1.5-3.1 1.3-1.9-2.8-3.3-.6L1 16l-1.9-2.1 1.9-2.9-.9-3.3 3.1-1.6 1-3.3 3.4.4Z" />
      <path
        d="M8.5 12.5 11 15l4.5-5.5"
        fill="none"
        stroke="var(--color-secondary-bg)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ItemDupesTab({ itemId }: { itemId: number }): React.JSX.Element {
  const [dupedUsers, setDupedUsers] = useState<ItemDupedUser[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setDupedUsers(null)
    setError(false)
    itemDetailApi
      .duplicateOwners(itemId)
      .then((result) => !cancelled && setDupedUsers(result))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [itemId])

  if (error) return <p className="py-8 text-center text-sm text-status-error">Failed to load dupers.</p>
  if (!dupedUsers) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
      </div>
    )
  }
  if (dupedUsers.length === 0) {
    return <p className="py-8 text-center text-sm text-quaternary-text">No duped copies of this item on record.</p>
  }

  return (
    <div className="divide-y divide-border-card overflow-hidden rounded-2xl border border-border-card bg-secondary-bg">
      {dupedUsers.map((user, index) => (
        <a
          key={user.id}
          href={`https://www.roblox.com/users/${user.id}/profile`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-tertiary-bg"
        >
          <span className="w-6 shrink-0 text-center text-sm font-bold text-tertiary-text">#{index + 1}</span>
          <RobloxAvatar userId={String(user.id)} label={user.displayName || user.name} className="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-sm font-semibold text-primary-text">
              {user.displayName || user.name}
              {user.hasVerifiedBadge && <VerifiedIcon className="h-3.5 w-3.5 shrink-0 text-button-info" />}
            </p>
            <p className="truncate text-xs text-secondary-text">@{user.name}</p>
          </div>
        </a>
      ))}
    </div>
  )
}
