import type { UserProfile } from '@shared/user'

const API_BASE = 'https://api.jailbreakchangelogs.com'

async function request<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: token }
  })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

export function resolveAvatarUrl(userId: string, avatar: string | null | undefined): string | null {
  if (!avatar) return null
  if (avatar.startsWith('http')) return avatar
  const ext = avatar.startsWith('a_') ? 'gif' : 'png'
  return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${ext}`
}

function normalize(user: UserProfile): UserProfile {
  return { ...user, avatar: resolveAvatarUrl(user.id, user.avatar) }
}

export const usersApi = {
  me: (token: string) => request<UserProfile>(token, '/v2/users/me').then(normalize),

  get: (token: string, id: string) =>
    request<UserProfile>(token, `/v2/users/${encodeURIComponent(id)}`).then(normalize),

  getBatch: async (token: string, ids: string[]): Promise<UserProfile[]> => {
    const query = ids.map(encodeURIComponent).join(',')
    const res = await request<UserProfile[] | Record<string, UserProfile>>(
      token,
      `/v2/users/batch?ids=${query}`
    )
    const users = Array.isArray(res) ? res : Object.values(res)
    return users.map(normalize)
  },

  search: async (token: string, username: string, limit = 10): Promise<UserProfile[]> => {
    if (!username.trim()) return []
    const params = new URLSearchParams({ query: username, limit: String(limit) })
    const res = await request<UserProfile[] | Record<string, UserProfile>>(
      token,
      `/v2/users/search?${params.toString()}`
    )
    const users = Array.isArray(res) ? res : Object.values(res)
    return users.map(normalize)
  }
}
