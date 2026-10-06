export interface NotificationItem {
  id: number
  user_id: string
  type?: string
  title: string
  description: string
  link: string
  metadata: Record<string, unknown> | null
  seen: number
  seen_at: number | null
  last_updated: number
  created_at?: number
}

export interface NotificationHistory {
  items: NotificationItem[]
  total: number
  page: number
  total_pages: number
  size: number
  unread_count?: number
}

export interface NotificationPreferenceRow {
  title: string
  enabled: 0 | 1
}

export interface NotificationPreferenceCategory {
  id: string
  label: string
  description: string
}

// Grouped like the website's notification settings. IDs match /v2/notifications/preference-options.
export const NOTIFICATION_PREFERENCE_GROUPS: readonly {
  id: string
  label: string
  categories: readonly NotificationPreferenceCategory[]
}[] = [
  {
    id: 'trading',
    label: 'Trading',
    categories: [
      { id: 'new_trade_offer', label: 'New Trade Offer', description: 'Someone sends an offer on one of your trade ads.' },
      { id: 'trade_offer_accepted', label: 'Trade Offer Accepted', description: 'Someone accepts an offer you sent.' },
      { id: 'trade_offer_declined', label: 'Trade Offer Declined', description: 'Someone declines an offer you sent.' },
      { id: 'trade_canceled', label: 'Trade Canceled', description: 'A trade ad or offer you were part of gets canceled.' }
    ]
  },
  {
    id: 'comments-and-followers',
    label: 'Comments and followers',
    categories: [
      { id: 'inventory_comment', label: 'Inventory Comment', description: 'Someone comments on your scanned inventory.' },
      { id: 'profile_comment', label: 'Profile Comment', description: 'Someone comments on your profile.' },
      { id: 'new_follower', label: 'New Follower', description: 'Someone starts following your profile.' },
      { id: 'new_comment_reply', label: 'Comment Reply', description: 'Someone replies to your comment on an item.' }
    ]
  },
  {
    id: 'inventory-and-items',
    label: 'Inventory and items',
    categories: [
      { id: 'inventory_scanned', label: 'Inventory Scanned', description: 'Your Roblox inventory finishes scanning.' },
      {
        id: 'holding_original_item',
        label: 'Holding Original Item',
        description: "You're flagged as holding the original copy of a duped item."
      },
      { id: 'item_updated', label: 'Item Updated', description: 'An item you care about gets updated.' }
    ]
  },
  {
    id: 'other',
    label: 'Other',
    categories: [
      { id: 'reminders', label: 'Reminders', description: 'Occasional reminders from the site, like re-scanning your inventory.' }
    ]
  }
]

export const NOTIFICATION_PREFERENCE_DEFAULT = true
