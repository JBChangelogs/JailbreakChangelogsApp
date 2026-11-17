import { normalizeUser } from '@renderer/lib/usersApi'
import type { UserProfile } from '@shared/user'

const API_BASE = 'https://api.jailbreakchangelogs.com'

const ERROR_MESSAGES: Record<string, string> = {
  self: "You can't add yourself as a friend",
  user_not_found: "That user doesn't exist",
  blocked: "You can't add this user as a friend",
  requests_disabled: "This user isn't accepting friend requests",
  already_friends: "You're already friends",
  already_requested: "You've already sent a friend request",
  friend_limit: 'Friend limit reached (100)',
  not_friends: "You're not friends with this user",
  request_not_found: 'That friend request no longer exists'
}

export class FriendError extends Error {}

export type FriendUser = UserProfile & { friends_since?: number; requested_at?: number }

interface FriendRow {
  user: UserProfile
  friends_since?: number
  created_at?: number
}

const flatten = ({ user, friends_since, created_at }: FriendRow): FriendUser => ({
  ...normalizeUser(user),
  friends_since,
  requested_at: created_at
})

async function request<T>(token: string, path: string, method = 'GET'): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method, headers: { Authorization: token } })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const code = body?.error as string | undefined
    const message = code === 'friend_limit' && body?.message ? String(body.message) : code && ERROR_MESSAGES[code]
    throw new FriendError(message || 'Something went wrong, try again')
  }
  return body as T
}

export const friendsApi = {
  friends: async (token: string): Promise<FriendUser[]> => {
    const all: FriendUser[] = []
    for (let page = 1; ; page++) {
      const res = await request<{ items: FriendRow[]; total_pages: number }>(token, `/v2/users/me/friends?page=${page}`)
      all.push(...res.items.map(flatten))
      if (page >= res.total_pages) return all
    }
  },

  requests: async (token: string): Promise<{ incoming: FriendUser[]; outgoing: FriendUser[] }> => {
    const res = await request<{ incoming: FriendRow[]; outgoing: FriendRow[] }>(token, '/v2/users/me/friend-requests')
    return { incoming: res.incoming.map(flatten), outgoing: res.outgoing.map(flatten) }
  },

  sendRequest: (token: string, id: string) =>
    request<{ status: 'pending' | 'accepted' }>(token, `/v2/users/me/friend-requests/${encodeURIComponent(id)}`, 'PUT'),

  deleteRequest: (token: string, id: string) =>
    request<unknown>(token, `/v2/users/me/friend-requests/${encodeURIComponent(id)}`, 'DELETE'),

  removeFriend: (token: string, id: string) =>
    request<unknown>(token, `/v2/users/me/friends/${encodeURIComponent(id)}`, 'DELETE')
}
