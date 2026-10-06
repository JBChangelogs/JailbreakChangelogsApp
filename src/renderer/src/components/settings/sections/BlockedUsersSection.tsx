import { useEffect, useState } from 'react'
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
    <div className="mt-8">
      <h2 className="text-xs font-bold tracking-wide text-quaternary-text uppercase">Blocked Users</h2>
      <p className="mt-0.5 text-xs text-tertiary-text">
        Blocked users can't message you, but can still see your profile, presence, and Roblox
        activity unless separately hidden above.
      </p>

      <div className="mt-3 space-y-1">
        {loading && <p className="text-sm text-quaternary-text">Loading…</p>}
        {!loading && blockedIds && blockedIds.length === 0 && (
          <p className="text-sm text-quaternary-text">You haven't blocked anyone.</p>
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
    </div>
  )
}
