export interface DupeFinderHistoryEntry {
  UserId: number
  TradeTime: number
}

export interface DupeFinderInfo {
  title: string
  value: string
}

export interface DupeFinderItem {
  item_id: number
  latest_owner?: string
  user_id?: string
  logged_at: number
  tradePopularMetric: number
  dupe_ratio?: number | null
  level: number | null
  history: DupeFinderHistoryEntry[]
  timesTraded: number
  id: string
  categoryTitle: string
  info: DupeFinderInfo[]
  uniqueCirculation: number
  season: number | null
  title: string
  isOriginalOwner: boolean
  scan_id?: string
}

export interface DupeOwnerSearchResult {
  id: string
  name: string
  displayName: string
  total_dupes: string
}

export interface RobloxUserSummary {
  id: number
  name: string
  displayName: string
  hasVerifiedBadge: boolean
}
