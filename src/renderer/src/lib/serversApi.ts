import { resolveAvatarUrl } from './usersApi'
import type { VipServer, VipServerWithOwner } from '@shared/servers'

const API_BASE = 'https://api.jailbreakchangelogs.com'

export const serversApi = {
  listMine: async (token: string): Promise<VipServer[]> => {
    const res = await fetch(`${API_BASE}/v2/users/me/servers`, { headers: { Authorization: token } })
    if (!res.ok) throw new Error(`Failed to load servers (${res.status})`)
    return res.json()
  },

  get: async (id: number): Promise<VipServerWithOwner | null> => {
    const res = await fetch(`${API_BASE}/v2/servers/${id}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Failed to load server (${res.status})`)
    const data = (await res.json()) as VipServerWithOwner
    return { ...data, user: { ...data.user, avatar: resolveAvatarUrl(data.user.id, data.user.avatar) } }
  }
}
