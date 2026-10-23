import { accentColorToHex, toAccentStyle, type Accent } from '@renderer/lib/accentColor'

const API_BASE = 'https://api.jailbreakchangelogs.com'

export interface SupporterHistoryEntry {
  level: number
  created_at: number | null
}

function extractError(data: unknown, status: number, fallback?: string): string {
  const obj = data as { message?: string; detail?: string; error?: string } | null
  return obj?.message ?? obj?.detail ?? obj?.error ?? fallback ?? `Request failed (${status})`
}

async function request<T>(token: string, path: string, init?: RequestInit, fallback?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: token, 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
  })
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new Error(extractError(data, res.status, fallback))
  return data as T
}

export const accountApi = {
  emailLinked: (token: string) => request<{ linked: boolean }>(token, '/v2/users/me/email'),
  emailNotifications: (token: string) => request<{ enabled: boolean }>(token, '/v2/notifications/email'),
  setEmailNotifications: (token: string, enabled: boolean) =>
    request<unknown>(
      token,
      '/v2/notifications/email',
      { method: enabled ? 'PUT' : 'DELETE' },
      enabled ? 'Failed to enable email notifications.' : 'Failed to disable email notifications.'
    ),
  supporterHistory: (token: string) => request<SupporterHistoryEntry[]>(token, '/v2/users/me/supporter/history'),
  setSupporterLevel: (token: string, level: number) =>
    request<unknown>(
      token,
      '/v2/users/me/supporter',
      { method: 'PATCH', body: JSON.stringify({ level }) },
      'Failed to change supporter tier.'
    ),
  accentColor: async (token: string): Promise<Accent | null> => {
    const data = await request<{ color?: unknown; gradient?: unknown; style?: unknown }>(
      token,
      '/v2/users/me/accent-color'
    )
    const toHex = (value: unknown): string | null =>
      typeof value === 'string' || typeof value === 'number' ? accentColorToHex(value) : null
    const color = toHex(data.color)
    return color ? { color, gradient: toHex(data.gradient), style: toAccentStyle(data.style) } : null
  },
  saveAccentColor: async (token: string, accent: Accent | null): Promise<void> => {
    const res = await fetch(`${API_BASE}/v2/users/me/accent-color`, {
      method: accent ? 'PUT' : 'DELETE',
      headers: { Authorization: token, ...(accent ? { 'Content-Type': 'application/json' } : {}) },
      body: accent ? JSON.stringify(accent) : undefined
    })
    if (res.ok) return
    if (res.status === 403) throw new Error('Custom accent colors need a supporter tier.')
    if (res.status === 429) throw new Error('Too many color changes. Try again in a minute.')
    throw new Error(extractError(await res.json().catch(() => null), res.status, 'Failed to save accent color.'))
  }
}
