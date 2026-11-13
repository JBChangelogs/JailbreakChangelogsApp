import { resolveAvatarUrl } from './usersApi'
import type { VipServer, VipServerPage, VipServerPayload, VipServerWithOwner } from '@shared/servers'

const API_BASE = 'https://api.jailbreakchangelogs.com'

async function request<T>(token: string | null, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      ...(token ? { Authorization: token } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {})
    },
    body: init?.body ? JSON.stringify(init.body) : undefined
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string; error?: string } | null
    const error = new Error(data?.message ?? `Request failed (${res.status})`) as Error & { status: number; code?: string }
    error.status = res.status
    error.code = data?.error
    throw error
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

const withAvatar = (server: VipServerWithOwner): VipServerWithOwner => ({
  ...server,
  user: { ...server.user, avatar: resolveAvatarUrl(server.user.id, server.user.avatar) }
})

export const serversApi = {
  listMine: (token: string): Promise<VipServer[]> => request(token, '/v2/users/me/servers'),

  get: async (id: number): Promise<VipServerWithOwner | null> => {
    try {
      return withAvatar(await request<VipServerWithOwner>(null, `/v2/servers/${id}`))
    } catch (err) {
      if ((err as { status?: number }).status === 404) return null
      throw err
    }
  },

  list: async (token: string, page: number, query: string, sort: string | null): Promise<VipServerPage> => {
    const params = new URLSearchParams({ page: String(page) })
    if (query) params.set('query', query)
    if (sort) params.set('sort', sort)
    const data = await request<VipServerPage>(token, `/v2/servers${query ? '/search' : ''}?${params}`)
    return { ...data, items: data.items.map(withAvatar) }
  },

  sorts: async (): Promise<{ value: string; label: string }[]> => {
    const data = await request<{ sorts: { value: string; label: string }[] }[]>(null, '/v2/servers/sorts')
    return data.flatMap((group) => group.sorts)
  },

  create: (token: string, payload: VipServerPayload): Promise<VipServer> =>
    request(token, '/v2/servers', { method: 'POST', body: payload }),

  update: (token: string, id: number, payload: VipServerPayload): Promise<VipServer> =>
    request(token, `/v2/servers/${id}`, { method: 'PATCH', body: payload }),

  remove: (token: string, id: number): Promise<void> => request(token, `/v2/servers/${id}`, { method: 'DELETE' }),

  report: (token: string, id: number, reason: string): Promise<void> =>
    request(token, `/v2/servers/${id}/reports`, { method: 'POST', body: { reason } })
}
