const INVENTORY_API_URL = 'https://inventories.jailbreakchangelogs.com'

export const TRADE_HISTORY_PAGE_SIZE = 25

export interface TradeItemDetail {
  item_id: string
  branch_id: string
  title: string
  category_title: string
  trade_time: number
  confidence: 'confirmed' | 'gap'
  is_duplicate_branch: boolean
  original_owner: string | null
  given_by_original_owner: boolean
  received_by_original_owner: boolean
}

export interface UserTradeSummary {
  trade_id: string
  counterparty_user_id: string
  items_given: TradeItemDetail[]
  items_received: TradeItemDetail[]
  first_time: number
  last_time: number
  confidence: 'confirmed' | 'partial'
  status: 'completed' | 'pending'
}

export interface TradeDetail {
  trade_id: string
  user_a: string
  user_b: string
  items_a_to_b: TradeItemDetail[]
  items_b_to_a: TradeItemDetail[]
  first_time: number
  last_time: number
  confidence: 'confirmed' | 'partial'
  status: 'completed' | 'pending'
}

export interface TradeActivity {
  days: Record<string, number>
  total: number
}

export interface TradeList<T> {
  completed: T[]
  pending: T[]
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => null)) as { message?: string; error?: string; detail?: string } | null
  return data?.message ?? data?.error ?? data?.detail ?? fallback
}

export const tradeHistoryApi = {
  fetchUserTrades: async (
    robloxId: string,
    before: number | null,
    signal?: AbortSignal
  ): Promise<TradeList<UserTradeSummary>> => {
    const params = new URLSearchParams({ limit: String(TRADE_HISTORY_PAGE_SIZE), nocache: 'false' })
    if (before !== null) params.set('before', String(before))
    const res = await fetch(`${INVENTORY_API_URL}/trades/user/${encodeURIComponent(robloxId)}?${params}`, { signal })
    if (!res.ok) throw new Error(await errorMessage(res, `Couldn't load trade history (${res.status}).`))
    const data = (await res.json()) as TradeList<UserTradeSummary>
    if (!Array.isArray(data?.completed) || !Array.isArray(data?.pending)) throw new Error('Invalid trade history response.')
    return data
  },

  fetchActivity: async (robloxId: string, days = 365): Promise<TradeActivity> => {
    const res = await fetch(`${INVENTORY_API_URL}/trades/user/${encodeURIComponent(robloxId)}/activity?days=${days}`)
    if (!res.ok) throw new Error(await errorMessage(res, `Couldn't load trade activity (${res.status}).`))
    const data = (await res.json()) as TradeActivity
    if (!data || typeof data.days !== 'object' || typeof data.total !== 'number') throw new Error('Invalid trade activity response.')
    return data
  },

  fetchTrade: async (tradeId: string, signal?: AbortSignal): Promise<TradeDetail> => {
    const res = await fetch(`${INVENTORY_API_URL}/trades/${encodeURIComponent(tradeId)}?nocache=false`, { signal })
    if (!res.ok) throw new Error(await errorMessage(res, `Couldn't load this trade (${res.status}).`))
    return (await res.json()) as TradeDetail
  }
}

export function nextTradesCursor(page: TradeList<UserTradeSummary>): number | null {
  const fullLists = [page.completed, page.pending].filter((list) => list.length === TRADE_HISTORY_PAGE_SIZE)
  if (fullLists.length === 0) return null
  return Math.max(...fullLists.map((list) => Math.min(...list.map((trade) => trade.first_time))))
}
