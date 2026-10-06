import { parseCashValue } from '@renderer/lib/itemValueUtils'
import type { DupeFinderItem } from '@shared/dupe'
import type { Item } from '@shared/item'

export function getDupedValueForItem(itemData: Item): number {
  const value = parseCashValue(itemData.duped_value)
  return value === -1 ? 0 : value
}

export function mergeDupeFinderWithMetadata(dupeItems: DupeFinderItem[], itemsData: Item[]): DupeFinderItem[] {
  const itemsMap = new Map(itemsData.map((item) => [item.id, item]))
  return dupeItems.map((dupeItem) => {
    const metadata = itemsMap.get(dupeItem.item_id)?.metadata
    if (!metadata) return dupeItem
    return {
      ...dupeItem,
      timesTraded: metadata.TimesTraded ?? dupeItem.timesTraded,
      uniqueCirculation: metadata.UniqueCirculation ?? dupeItem.uniqueCirculation
    }
  })
}

function duplicateGroupKey(item: DupeFinderItem): string {
  return `${item.categoryTitle}-${item.title}`
}

export function computeDuplicateInfo(items: DupeFinderItem[]): {
  counts: Map<string, number>
  orders: Map<string, number>
} {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = duplicateGroupKey(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const orders = new Map<string, number>()
  const groups = new Map<string, DupeFinderItem[]>()
  for (const item of items) {
    const key = duplicateGroupKey(item)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  for (const group of groups.values()) {
    if (group.length <= 1) continue
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id))
    sorted.forEach((item, index) => orders.set(item.id, index + 1))
  }

  return { counts, orders }
}
