import { useEffect, useSyncExternalStore } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { friendsApi, type FriendUser } from '@renderer/lib/friendsApi'

export type FriendStatus = 'friends' | 'incoming' | 'outgoing' | 'none'

export interface FriendsState {
  friends: ReadonlyMap<string, FriendUser>
  incoming: ReadonlyMap<string, FriendUser>
  outgoing: ReadonlyMap<string, FriendUser>
}

let state: FriendsState | null = null
let currentToken: string | null = null
let generation = 0
const listeners = new Set<() => void>()

const byId = (users: FriendUser[]): Map<string, FriendUser> => new Map(users.map((u) => [u.id, u]))

function setState(next: FriendsState | null): void {
  state = next
  listeners.forEach((listener) => listener())
}

export function refreshFriends(): Promise<void> {
  const token = currentToken
  if (!token) return Promise.resolve()
  const run = ++generation
  return Promise.all([friendsApi.friends(token), friendsApi.requests(token)])
    .then(([friends, requests]) => {
      if (run !== generation) return
      setState({ friends: byId(friends), incoming: byId(requests.incoming), outgoing: byId(requests.outgoing) })
    })
    .catch(() => {})
}

function applyUpdate(userId: string, status: FriendStatus): void {
  if (!state) return
  const outgoing = state.outgoing.get(userId)
  const without = (map: ReadonlyMap<string, FriendUser>): Map<string, FriendUser> => {
    const next = new Map(map)
    next.delete(userId)
    return next
  }
  const next = { friends: without(state.friends), incoming: without(state.incoming), outgoing: without(state.outgoing) }
  if (status === 'friends' && outgoing) next.friends.set(userId, { ...outgoing, friends_since: Math.floor(Date.now() / 1000) })
  setState(next)
  if ((status === 'friends' && !outgoing) || status === 'incoming' || status === 'outgoing') void refreshFriends()
}

export function useFriendsSync(): void {
  const { token } = useAuth()
  const { subscribe } = useRealtime()

  useEffect(() => {
    currentToken = token
    generation++
    setState(null)
    if (token) void refreshFriends()
  }, [token])

  useEffect(
    () =>
      subscribe((message) => {
        if (message.action !== 'friend_update') return
        const data = message.data as { user_id?: string; status?: string } | undefined
        if (!data?.user_id) return
        const status: FriendStatus =
          data.status === 'friends' || data.status === 'incoming' || data.status === 'outgoing' ? data.status : 'none'
        applyUpdate(data.user_id, status)
      }),
    [subscribe]
  )
}

const subscribeStore = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useFriends(): FriendsState | null {
  return useSyncExternalStore(subscribeStore, () => state)
}

export function useFriendStatus(userId: string): FriendStatus | null {
  const current = useFriends()
  if (!current) return null
  if (current.friends.has(userId)) return 'friends'
  if (current.incoming.has(userId)) return 'incoming'
  if (current.outgoing.has(userId)) return 'outgoing'
  return 'none'
}
