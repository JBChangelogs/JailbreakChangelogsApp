import type { DupeFinderItem, DupeOwnerSearchResult, RobloxUserSummary } from '@shared/dupe'

const INVENTORY_API_URL = 'https://inventories.jailbreakchangelogs.com'

export class DupeUserNotFoundError extends Error {}
export class NoDupesFoundError extends Error {}

export const dupesApi = {
  searchOwners: async (query: string, limit = 15, signal?: AbortSignal): Promise<DupeOwnerSearchResult[]> => {
    const res = await fetch(
      `${INVENTORY_API_URL}/dupes/search/owners?query=${encodeURIComponent(query)}&limit=${limit}`,
      { signal }
    )
    if (!res.ok) {
      if (res.status === 404) return []
      throw new Error('Failed to search dupe owners')
    }
    const data = await res.json()
    return Array.isArray(data) ? data : []
  },

  fetchUserDupes: async (robloxId: string): Promise<DupeFinderItem[]> => {
    const res = await fetch(`${INVENTORY_API_URL}/users/dupes?id=${encodeURIComponent(robloxId)}`)
    if (!res.ok) {
      if (res.status === 404) throw new NoDupesFoundError('No recorded dupes found for this user.')
      throw new Error('Failed to fetch dupe finder data')
    }
    const data = await res.json()
    return Array.isArray(data) ? data : []
  },

  resolveUsername: async (username: string): Promise<RobloxUserSummary | null> => {
    const res = await fetch(`${INVENTORY_API_URL}/proxy/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    })
    if (!res.ok) throw new DupeUserNotFoundError(`Username "${username}" not found.`)
    const data = await res.json()
    const user = Array.isArray(data?.data) ? data.data[0] : null
    return user?.id ? user : null
  },

  fetchUsersBatch: async (ids: string[]): Promise<Record<string, RobloxUserSummary>> => {
    const validIds = ids.filter((id) => /^\d+$/.test(id)).map(Number)
    if (validIds.length === 0) return {}
    const res = await fetch(`${INVENTORY_API_URL}/proxy/users/v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: validIds })
    })
    if (!res.ok) return {}
    const data = await res.json()
    return data && typeof data === 'object' ? data : {}
  },

  fetchDuplicateVariants: async (
    dupeFinderItemId: string
  ): Promise<{ og: DupeFinderItem; duplicate: DupeFinderItem } | null> => {
    const res = await fetch(`${INVENTORY_API_URL}/item/duplicates/variants?id=${encodeURIComponent(dupeFinderItemId)}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error('Failed to fetch duplicate variants')
    return res.json()
  }
}

export function getRobloxAvatarUrl(userId: string | number): string {
  return `${INVENTORY_API_URL}/proxy/users/${userId}/avatar-headshot`
}
