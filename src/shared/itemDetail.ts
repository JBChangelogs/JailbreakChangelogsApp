import type { Item } from './item'

export interface ValueHistoryEntry {
  id: string
  name: string
  type: string
  date: string
  cash_value: string
  duped_value: string
}

export interface ItemHoarder {
  user_id: string
  count: number
}

export interface ItemDupedUser {
  id: number
  name: string
  displayName: string
  avatar: string
  hasVerifiedBadge: boolean
}

export interface SuggestionUser {
  id: string
  username: string
  global_name: string | null
  avatar: string | null
  roblox_id: string | null
  roblox_username: string | null
  roblox_display_name: string | null
  roblox_avatar: string | null
}

export interface SuggestionVote {
  created_at: number
  user: SuggestionUser
}

export interface ValueSuggestion {
  id: number
  field: string
  current_value: string
  suggested_value: string
  reason: string | null
  status: string
  upvotes: number
  downvotes: number
  created_at: number
  updated_at: number
  is_vt: number
  rejection_reason: string | null
  rejection_proof: string | null
  rejected_by: string | null
  common_trades: string | null
  user: SuggestionUser
  item: Item
  votes: { upvotes: SuggestionVote[]; downvotes: SuggestionVote[] }
}

export interface SuggestionsPage {
  total: number
  items?: ValueSuggestion[]
  page: number
  total_pages: number
  size: number
}
