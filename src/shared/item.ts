export interface RecentChange {
  changelog_id: number
  suggestion_id: number
  changed_by: string
  created_at: number
  field: string
  current_value: string
  suggested_value: string
}

export interface ItemMetadata {
  ItemId?: number
  Type?: string
  Name?: string
  TimesTraded?: number
  UniqueCirculation?: number
  DemandMultiple?: number
  LastUpdated?: number
}

export interface Item {
  id: number
  name: string
  type: string
  creator: string
  is_seasonal: 0 | 1
  cash_value: string
  duped_value: string
  price: string
  is_limited: 0 | 1
  notes: string
  demand: string
  duped_demand: string
  description: string
  health: number
  tradable: 0 | 1
  last_updated?: number
  trend: string | null
  metadata?: ItemMetadata | null
  recent_changes?: RecentChange[] | null
}
