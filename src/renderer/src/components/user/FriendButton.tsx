import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { useAuth } from '@renderer/contexts/AuthContext'
import { refreshFriends, useFriendStatus } from '@renderer/hooks/useFriends'
import { friendsApi, FriendError } from '@renderer/lib/friendsApi'
import { showToast } from '@renderer/lib/toast'

function Icon({ d }: { d: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const USER_PLUS = 'M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z'
const USER_MINUS = 'M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z'
const CHECK = 'm4.5 12.75 6 6 9-13.5'
const X_MARK = 'M6 18 18 6M6 6l12 12'
const CLOCK = 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'

export function FriendButton({ userId, size = 'sm' }: { userId: string; size?: 'sm' | 'md' }): React.JSX.Element | null {
  const { token } = useAuth()
  const status = useFriendStatus(userId)
  const [busy, setBusy] = useState(false)

  if (!token || status === null) return null

  const run = async (action: () => Promise<string>): Promise<void> => {
    setBusy(true)
    try {
      showToast(await action())
    } catch (err) {
      showToast(err instanceof FriendError ? err.message : 'Something went wrong, try again')
    } finally {
      setBusy(false)
      void refreshFriends()
    }
  }

  const send = (): Promise<void> =>
    run(async () =>
      (await friendsApi.sendRequest(token, userId)).status === 'accepted' ? "You're now friends" : 'Friend request sent'
    )
  const deleteRequest = (): Promise<void> =>
    run(async () => {
      await friendsApi.deleteRequest(token, userId)
      return status === 'incoming' ? 'Friend request declined' : 'Friend request canceled'
    })
  const remove = (): Promise<void> =>
    run(async () => {
      await friendsApi.removeFriend(token, userId)
      return 'Friend removed'
    })

  if (status === 'none') {
    return (
      <Button type="button" size={size} disabled={busy} onClick={() => void send()}>
        <Icon d={USER_PLUS} />
        Add Friend
      </Button>
    )
  }

  if (status === 'incoming') {
    return (
      <div className="flex items-center gap-1.5">
        <Button type="button" size={size} variant="success" disabled={busy} onClick={() => void send()}>
          <Icon d={CHECK} />
          Accept
        </Button>
        <Button
          type="button"
          size={size}
          variant="secondary"
          disabled={busy}
          aria-label="Decline friend request"
          className={size === 'sm' ? 'w-8! px-0!' : 'w-10! px-0!'}
          onClick={() => void deleteRequest()}
        >
          <Icon d={X_MARK} />
        </Button>
      </div>
    )
  }

  const [idleIcon, idleLabel, hoverIcon, hoverLabel, onClick] =
    status === 'outgoing'
      ? [CLOCK, 'Pending', X_MARK, 'Cancel', deleteRequest]
      : [CHECK, 'Friends', USER_MINUS, 'Remove', remove]

  return (
    <Button type="button" size={size} variant="secondary" disabled={busy} className="group" onClick={() => void onClick()}>
      <span className="inline-flex items-center gap-1.5 group-hover:hidden">
        <Icon d={idleIcon} />
        {idleLabel}
      </span>
      <span className="hidden items-center gap-1.5 group-hover:inline-flex">
        <Icon d={hoverIcon} />
        {hoverLabel}
      </span>
    </Button>
  )
}
