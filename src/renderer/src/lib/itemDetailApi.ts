import type { Item } from '@shared/item'
import type { ItemDupedUser, ItemHoarder, SuggestionsPage, ValueHistoryEntry } from '@shared/itemDetail'

const API_BASE = 'https://api.jailbreakchangelogs.com'
const INVENTORY_API_URL = 'https://inventories.jailbreakchangelogs.com'

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    if (res.status === 404) return [] as unknown as T
    throw new Error(`Request failed (${res.status})`)
  }
  return res.json()
}

export interface ItemsPage {
  total: number
  items: Item[]
  page: number
  size: number
}

export interface ItemsQuery {
  page: number
  sort: string
  filters: string[]
  search: string
}

async function getItemsPage(path: string, params: URLSearchParams, page: number): Promise<ItemsPage> {
  const res = await fetch(`${API_BASE}${path}?${params.toString()}`)
  if (res.status === 404) return { total: 0, items: [], page, size: 0 }
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

export const itemsApi = {
  list: ({ page, sort, filters, search }: ItemsQuery): Promise<ItemsPage> => {
    const params = new URLSearchParams({ page: String(page), sort })
    if (filters.length > 0) params.set('filter', filters.join(','))
    const query = search.trim().slice(0, 25)
    if (!query) return getItemsPage('/v2/items', params, page)
    params.set('query', query)
    return getItemsPage('/v2/items/search', params, page)
  },

  get: async (id: number): Promise<Item | null> => {
    const res = await fetch(`${API_BASE}/v2/items/${id}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Request failed (${res.status})`)
    return res.json()
  },

  similar: (id: number) => getJson<Item[]>(`${API_BASE}/v2/items/${id}/similar`)
}

export const itemDetailApi = {
  valueHistory: (id: number) => getJson<ValueHistoryEntry[]>(`${API_BASE}/v2/items/${id}/history`),

  hoarders: (name: string, type: string) =>
    getJson<ItemHoarder[]>(`${INVENTORY_API_URL}/items/hoarders?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`),

  duplicateOwners: (itemId: number) =>
    getJson<ItemDupedUser[]>(`${INVENTORY_API_URL}/item/duplicates?id=${itemId}&limit=5000`),

  suggestions: (itemId: number, page: number, token?: string | null) =>
    getJson<SuggestionsPage>(`${API_BASE}/v2/items/${itemId}/value-suggestions?page=${page}`, {
      headers: token ? { Authorization: token } : undefined
    }),

  changelogs: (itemId: number, page: number) =>
    getJson<SuggestionsPage>(`${API_BASE}/v2/items/${itemId}/value-changelogs?page=${page}`),

  vote: (suggestionId: number, token: string, voteType: 'upvote' | 'downvote') =>
    fetch(`${API_BASE}/v2/value-suggestions/${suggestionId}/votes/me`, {
      method: 'PUT',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote_type: voteType })
    }).then((res) => {
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
    }),

  unvote: (suggestionId: number, token: string) =>
    fetch(`${API_BASE}/v2/value-suggestions/${suggestionId}/votes/me`, {
      method: 'DELETE',
      headers: { Authorization: token }
    }).then((res) => {
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
    }),

  userVote: (suggestionId: number, userId: string, token: string) =>
    getJson<{ voted?: boolean; vote_type?: 'upvote' | 'downvote' }>(
      `${API_BASE}/v2/value-suggestions/${suggestionId}/votes/${userId}`,
      { headers: { Authorization: token } }
    )
      .then((res) => (res.voted && res.vote_type ? { vote_type: res.vote_type } : null))
      .catch(() => null)
}
