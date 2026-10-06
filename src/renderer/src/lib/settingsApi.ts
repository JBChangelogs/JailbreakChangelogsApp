import type { SettingsCategories } from '@shared/settings'

const API_BASE = 'https://api.jailbreakchangelogs.com'

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: token, ...(init?.headers ?? {}) }
  })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

export const settingsApi = {
  getMine: (token: string) => request<SettingsCategories>('/v2/users/me/settings', token),

  updateMine: (token: string, updates: { name: string; value: boolean }[]) =>
    request<void>('/v2/users/me/settings', token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: updates })
    })
}
