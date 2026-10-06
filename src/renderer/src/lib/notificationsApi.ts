import type { NotificationHistory, NotificationPreferenceRow } from '@shared/notification'

const API_BASE = 'https://api.jailbreakchangelogs.com'

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.message === 'string') return data.message
  } catch {
  }
  return `Request failed (${res.status})`
}

async function get<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: token } : undefined })
  if (!res.ok) throw new Error(await readErrorMessage(res))
  return res.json()
}

async function del(path: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: { Authorization: token } })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
}

export const notificationsApi = {
  unread: (token: string, page = 1, size = 5) =>
    get<NotificationHistory>(`/v2/notifications?page=${page}&size=${size}`, token),

  history: (token: string, page = 1, size = 5) =>
    get<NotificationHistory>(`/v2/notifications/history?page=${page}&size=${size}`, token),

  unreadCount: (token: string) => get<{ unread_count: number }>('/v2/notifications/unread-count', token),

  clearHistory: (token: string) => del('/v2/notifications/history', token),

  markAllRead: (token: string) => del('/v2/notifications', token),

  getPreferences: (userId: string) =>
    get<{ preferences: NotificationPreferenceRow[] }>(
      `/v2/users/${encodeURIComponent(userId)}/notification-preferences`
    ),

  updatePreferences: async (token: string, preferences: { title: string; enabled: boolean }[]): Promise<void> => {
    const res = await fetch(`${API_BASE}/v2/users/me/notification-preferences`, {
      method: 'PATCH',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences })
    })
    if (!res.ok) throw new Error(await readErrorMessage(res))
  },

  getEmailPreference: async (token: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/v2/notifications/email`, { headers: { Authorization: token } })
    if (res.status === 404) return false
    if (!res.ok) throw new Error(await readErrorMessage(res))
    const data = (await res.json()) as { enabled: boolean }
    return data.enabled
  },

  setEmailPreference: async (token: string, enabled: boolean): Promise<void> => {
    const res = await fetch(`${API_BASE}/v2/notifications/email`, {
      method: enabled ? 'PUT' : 'DELETE',
      headers: { Authorization: token }
    })
    if (!res.ok) throw new Error(await readErrorMessage(res))
  }
}
