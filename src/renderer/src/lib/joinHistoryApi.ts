const API_BASE = 'https://api.jailbreakchangelogs.com'

export type TrackerType = 'robbery' | 'bounty'

export interface JoinHistoryApiItem {
  timestamp: string
  tracker_type: TrackerType
  marker_name: string
  display_name: string
}

export interface JoinHistoryApiPage {
  total: number
  items: JoinHistoryApiItem[]
  page: number
  total_pages: number
  size: number
}

export const joinHistoryApi = {

  getJoinHistory: async (token: string, trackerType: TrackerType, page = 1): Promise<JoinHistoryApiPage> => {
    const res = await fetch(`${API_BASE}/v2/users/me/join-history?page=${page}&tracker_type=${trackerType}`, {
      headers: { Authorization: token }
    })
    if (res.status === 404) {
      return { total: 0, items: [], page, total_pages: 0, size: 50 }
    }
    if (!res.ok) throw new Error(`Failed to load join history (${res.status})`)
    return res.json()
  }
}
