export interface TradeItemWire {
  id: string
  amount?: number
  duped?: boolean
  og?: boolean
  name?: string
  type?: string
  info?: {
    cash_value?: string | null
    duped_value?: string | null
    trend?: string | null
    demand?: string | null
    notes?: string | null
  } | null
}

export interface TradeAdUser {
  id: string
  username: string
  global_name?: string
  avatar?: string | null
  roblox_id?: string
  roblox_username?: string
  roblox_display_name?: string
  roblox_avatar?: string
  usernumber?: number
  premiumtype?: number
}

export interface TradeAd {
  id: number
  requesting: TradeItemWire[]
  offering: TradeItemWire[]
  author: string
  note?: string | null
  created_at: number
  expires: number
  message_id?: string | null
  user?: TradeAdUser
}

export interface TradeAdsPage {
  items: TradeAd[]
  total: number
  page: number
  total_pages: number
  size: number
}

export type TradeOfferStatus = 0 | 1 | 2 | 3

export interface TradeOffer {
  id: number
  trade: number
  note?: string | null
  requesting?: TradeItemWire[] | null
  offering?: TradeItemWire[] | null
  user?: TradeAdUser | null
  created_at?: number
  status?: TradeOfferStatus | null
}

export const CUSTOM_TRADE_TYPES: readonly { id: string; label: string; icon: string }[] = [
  { id: 'adds', label: 'Adds', icon: 'adds' },
  { id: 'overpays', label: 'Overpays', icon: 'overpays' },
  { id: 'upgrades', label: 'Upgrades', icon: 'upgrades' },
  { id: 'downgrades', label: 'Downgrades', icon: 'downgrades' },
  { id: 'collectors', label: 'Collectors', icon: 'collectors' },
  { id: 'rares', label: 'Rares', icon: 'rares' },
  { id: 'demands', label: 'Demands', icon: 'demands' },
  { id: 'og owners', label: 'OG Owners', icon: 'og_owners' }
]

const TRADE_ICON_BASE_URL = 'https://assets.jailbreakchangelogs.com/assets/items/trade_icons'

export function getCustomTradeTypeIconUrl(icon: string): string {
  return `${TRADE_ICON_BASE_URL}/${icon}.webp`
}

const CUSTOM_TRADE_TYPE_IDS = new Set(CUSTOM_TRADE_TYPES.map((t) => t.id))

export function isCustomTradeItemId(id: string): boolean {
  return CUSTOM_TRADE_TYPE_IDS.has(id) || !/^\d+$/.test(id)
}

export const EXPIRATION_HOURS_BY_TIER: Record<number, number[]> = {
  0: [6],
  1: [6, 12],
  2: [6, 12, 24],
  3: [6, 12, 24, 48]
}
