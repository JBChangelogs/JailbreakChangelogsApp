import type { SupporterGift, SupporterLevel } from '@shared/gifts'

const API_BASE = 'https://api.jailbreakchangelogs.com'

function extractError(data: unknown, status: number): string {
  const obj = data as { message?: string; error?: string } | null
  return obj?.message ?? obj?.error ?? `Request failed (${status})`
}

export const giftsApi = {
  list: async (token: string): Promise<SupporterGift[]> => {
    const res = await fetch(`${API_BASE}/v2/users/me/gifts`, { headers: { Authorization: token } })
    if (!res.ok) throw new Error(extractError(await res.json().catch(() => null), res.status))
    return res.json()
  },

  levels: async (): Promise<SupporterLevel[]> => {
    const res = await fetch(`${API_BASE}/v2/supporter/levels`)
    if (!res.ok) throw new Error(extractError(await res.json().catch(() => null), res.status))
    const data = (await res.json()) as { levels?: SupporterLevel[] }
    return data.levels ?? []
  },

  // dm: also post the gift in your DM with them. Gifts from outside a conversation leave it off.
  redeem: async (token: string, shareId: string, userId: string, dm = false): Promise<void> => {
    const res = await fetch(`${API_BASE}/v2/gifts/${encodeURIComponent(shareId)}/redemptions`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, dm })
    })
    if (!res.ok) throw new Error(extractError(await res.json().catch(() => null), res.status))
  }
}
