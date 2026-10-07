import {
  ITEM_TYPE_FILTERS,
  VALUE_SORT_GROUPS,
  demandOrder,
  parseCashValue,
  type ValueSort
} from '@renderer/lib/itemValueUtils'
import type { Item } from '@shared/item'

// Sorts that work on the cached item list (circulation and last-updated need fields it doesn't have).
export const LOCAL_SORT_GROUPS = VALUE_SORT_GROUPS.filter((g) => ['Values', 'Alphabetically', 'Demand'].includes(g.label))

export interface ItemBrowseFilters {
  search: string
  types: ReadonlySet<string>
  demand: ReadonlySet<string>
  trend: ReadonlySet<string>
  sort: ValueSort
}

// Stable per-session shuffle key for the "Random" sort.
const randomKey = new Map<number, number>()
const shuffleKey = (id: number): number => {
  if (!randomKey.has(id)) randomKey.set(id, Math.random())
  return randomKey.get(id)!
}

function compare(a: Item, b: Item, sort: ValueSort): number {
  switch (sort) {
    case 'cash-asc':
      return parseCashValue(a.cash_value) - parseCashValue(b.cash_value)
    case 'duped-desc':
      return parseCashValue(b.duped_value) - parseCashValue(a.duped_value)
    case 'duped-asc':
      return parseCashValue(a.duped_value) - parseCashValue(b.duped_value)
    case 'alpha-asc':
      return a.name.localeCompare(b.name)
    case 'alpha-desc':
      return b.name.localeCompare(a.name)
    case 'random':
      return shuffleKey(a.id) - shuffleKey(b.id)
    case 'demand-desc':
    case 'demand-asc': {
      const rank = (d: string | null): number => (demandOrder as readonly string[]).indexOf(d ?? '')
      const diff = rank(b.demand) - rank(a.demand)
      return sort === 'demand-desc' ? diff : -diff
    }
    default:
      return parseCashValue(b.cash_value) - parseCashValue(a.cash_value)
  }
}

export function filterAndSortItems(items: Item[], f: ItemBrowseFilters): Item[] {
  const wantedTypes = new Set(
    ITEM_TYPE_FILTERS.filter((t) => f.types.has(t.value)).map((t) => t.type)
  )
  const query = f.search.trim().toLowerCase()
  return items
    .filter(
      (item) =>
        (wantedTypes.size === 0 || wantedTypes.has(item.type.toLowerCase())) &&
        (f.demand.size === 0 || f.demand.has(item.demand ?? '')) &&
        (f.trend.size === 0 || f.trend.has(item.trend ?? '')) &&
        (!query || item.name.toLowerCase().includes(query))
    )
    .sort((a, b) => compare(a, b, f.sort))
}
