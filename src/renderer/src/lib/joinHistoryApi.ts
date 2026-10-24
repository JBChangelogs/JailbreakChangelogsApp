const API_BASE = 'https://api.jailbreakchangelogs.com'

export type TrackerType = 'robbery' | 'bounty'

export interface JoinHistoryCounts {
  total: number
  counts: Record<string, { joins: number; last_joined: string }>
}

export const joinHistoryApi = {

  getJoinCounts: async (token: string, trackerType: TrackerType): Promise<JoinHistoryCounts> => {
    const res = await fetch(`${API_BASE}/v2/users/me/join-history/counts?tracker_type=${trackerType}`, {
      headers: { Authorization: token }
    })
    if (res.status === 404) return { total: 0, counts: {} }
    if (!res.ok) throw new Error(`Failed to load join history (${res.status})`)
    return res.json()
  }
}
