const INVENTORY_API_URL = 'https://inventories.jailbreakchangelogs.com'

interface RawInventoryEntry {
  id?: number | string
  is_original_owner?: boolean | number | string
  isOriginalOwner?: boolean | number | string
  is_og?: boolean | number | string
}

export interface UserInventoryItem {
  itemId: number
  duped: boolean
  og: boolean
  count: number
}

function normalizeEntry(entry: unknown): { id: number | null; isOriginalOwner: boolean } {
  if (!entry || typeof entry !== 'object') return { id: null, isOriginalOwner: false }
  const record = entry as RawInventoryEntry
  const rawId = record.id
  const parsedId = typeof rawId === 'number' ? rawId : typeof rawId === 'string' ? Number(rawId) : null
  const id = parsedId !== null && Number.isFinite(parsedId) ? Math.trunc(parsedId) : null

  const rawOg = record.is_original_owner ?? record.isOriginalOwner ?? record.is_og
  const isOriginalOwner =
    typeof rawOg === 'boolean'
      ? rawOg
      : typeof rawOg === 'number'
        ? rawOg === 1
        : typeof rawOg === 'string'
          ? rawOg.toLowerCase() === 'true' || rawOg === '1'
          : false

  return { id, isOriginalOwner }
}

export interface UserInventoryResult {
  items: UserInventoryItem[]
  tradeNote: string | null
}

export const robloxInventoryApi = {
  fetchUserInventory: async (robloxId: string): Promise<UserInventoryResult> => {
    const res = await fetch(
      `${INVENTORY_API_URL}/user/inventory?id=${encodeURIComponent(robloxId)}&nocache=false`
    )
    if (!res.ok) throw new Error(`Failed to load inventory (${res.status})`)
    const data = await res.json()
    const record = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
    const rawItems = Array.isArray(record.data) ? record.data : []
    const rawDuplicates = Array.isArray(record.duplicates) ? record.duplicates : []

    const key = (id: number, duped: boolean): string => `${id}:${duped}`
    const counts = new Map<string, { itemId: number; duped: boolean; og: boolean; count: number }>()
    const accumulate = (entry: unknown, duped: boolean): void => {
      const { id, isOriginalOwner } = normalizeEntry(entry)
      if (id === null) return
      const k = key(id, duped)
      const existing = counts.get(k)
      if (existing) {
        existing.count += 1
        existing.og = existing.og || isOriginalOwner
      } else {
        counts.set(k, { itemId: id, duped, og: isOriginalOwner, count: 1 })
      }
    }
    rawItems.forEach((entry: unknown) => accumulate(entry, false))
    rawDuplicates.forEach((entry: unknown) => accumulate(entry, true))

    const tradeNote =
      record.trade_note && typeof record.trade_note === 'object' && typeof record.trade_note.note === 'string'
        ? record.trade_note.note.trim() || null
        : null

    return { items: [...counts.values()], tradeNote }
  }
}
