import type { TradeAd, TradeAdsPage, TradeItemWire, TradeOffer } from '@shared/trading'

const API_BASE = 'https://api.jailbreakchangelogs.com'

async function request<T>(
  token: string,
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: token,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {})
    },
    body: init?.body ? JSON.stringify(init.body) : undefined
  })

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (typeof data?.message === 'string') message = data.message
    } catch {
    }
    const error = new Error(message) as Error & { status: number }
    error.status = res.status
    throw error
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export interface CreateTradeItemPayload {
  id: string
  amount?: number
  duped?: boolean
  og?: boolean
}

export interface CreateTradeAdPayload {
  offering: CreateTradeItemPayload[]
  requesting: CreateTradeItemPayload[]
  note: string | null
  expiration: number
}

export interface CreateOfferPayload {
  note?: string
  requesting?: CreateTradeItemPayload[]
  offering?: CreateTradeItemPayload[]
}

export const tradesApi = {
  listRecent: async (token: string, page = 1, userId?: string): Promise<TradeAdsPage> => {
    const params = new URLSearchParams({ page: String(page) })
    if (userId) params.set('user', userId)
    try {
      return await request<TradeAdsPage>(token, `/v2/trades?${params.toString()}`)
    } catch (err) {
      if (err instanceof Error && (err as Error & { status?: number }).status === 404) {
        return { items: [], total: 0, page, total_pages: 0, size: 0 }
      }
      throw err
    }
  },

  get: (token: string, id: number) => request<TradeAd>(token, `/v2/trades/${id}`),

  create: (token: string, payload: CreateTradeAdPayload) =>
    request<TradeAd>(token, '/v2/trades', { method: 'POST', body: payload }),

  delete: (token: string, id: number) =>
    request<void>(token, `/v2/trades/${id}`, { method: 'DELETE' }),

  listOffers: (token: string, tradeId: number) =>
    request<TradeOffer[]>(token, `/v2/trades/${tradeId}/offers`),

  createOffer: (token: string, tradeId: number, payload?: CreateOfferPayload) =>
    request<TradeOffer>(token, `/v2/trades/${tradeId}/offers`, {
      method: 'POST',
      body: payload ?? {}
    }),

  respondToOffer: (
    token: string,
    tradeId: number,
    offerId: number,
    status: 'accept' | 'decline'
  ) =>
    request<void>(token, `/v2/trades/${tradeId}/offers/${offerId}`, {
      method: 'PATCH',
      body: { status }
    }),

  deleteOffer: (token: string, tradeId: number, offerId: number) =>
    request<void>(token, `/v2/trades/${tradeId}/offers/${offerId}`, { method: 'DELETE' })
}

export type { TradeAd, TradeAdsPage, TradeItemWire, TradeOffer }
