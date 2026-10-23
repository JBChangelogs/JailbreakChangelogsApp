import { useEffect, useState } from 'react'
import { SettingsCard } from '@renderer/components/settings/SettingsCard'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useBlockedUsers } from '@renderer/hooks/useBlockedUsers'
import { usersApi } from '@renderer/lib/usersApi'
import { UserAvatar } from '@renderer/components/messages/UserAvatar'
import { Button } from '@renderer/components/ui/button'
import type { UserProfile } from '@shared/user'

export function BlockedUsersSection(): React.JSX.Element {
  const { token } = useAuth()
  const { blockedIds, loading, unblock } = useBlockedUsers()
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map())
  const [unblockingIds, setUnblockingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!token || !blockedIds || blockedIds.length === 0) return
    const missing = blockedIds.filter((id) => !profiles.has(id))
    if (missing.length === 0) return
    usersApi
      .getBatch(token, missing)
      .then((users) => {
        setProfiles((prev) => {
          const next = new Map(prev)
          for (const user of users) next.set(user.id, user)
          return next
        })
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, blockedIds])

  const handleUnblock = async (id: string): Promise<void> => {
    setUnblockingIds((prev) => new Set(prev).add(id))
    try {
      await unblock(id)
    } catch {
    } finally {
      setUnblockingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <SettingsCard
      title="Blocked Users"
      icon={BlockIcon}
      description={
        <p>
          Blocked users can&apos;t message you, but can still see your profile, presence, and Roblox activity unless
          separately hidden above.
        </p>
      }
    >
      <div className="-mx-2 space-y-1">
        {loading && <p className="py-6 text-center text-sm text-quaternary-text">Loading…</p>}
        {!loading && blockedIds && blockedIds.length === 0 && (
          <div className="mx-2 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-card px-4 py-8 text-center">
            <BlockIcon className="size-8 text-secondary-text" />
            <p className="text-sm font-medium text-primary-text">No blocked users</p>
            <p className="max-w-sm text-sm text-secondary-text">
              People you block from their profile or a chat show up here, so you can unblock them later.
            </p>
          </div>
        )}
        {!loading &&
          blockedIds?.map((id) => {
            const profile = profiles.get(id)
            const label = profile?.username || profile?.name || `User #${id.slice(-6)}`
            return (
              <div
                key={id}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-quaternary-bg"
              >
                <UserAvatar id={id} profile={profile} className="h-7 w-7" />
                <span className="min-w-0 flex-1 truncate text-sm text-primary-text">{label}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={unblockingIds.has(id)}
                  onClick={() => void handleUnblock(id)}
                >
                  {unblockingIds.has(id) ? 'Unblocking…' : 'Unblock'}
                </Button>
              </div>
            )
          })}
      </div>
    </SettingsCard>
  )
}

function BlockIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="m5.6 5.6 12.8 12.8" />
    </svg>
  )
}
