import { useEffect, useState } from 'react'
import { FilterMenu } from '@renderer/components/tracker/FilterMenus'
import { useValues } from '@renderer/contexts/ValuesContext'
import { itemsApi } from '@renderer/lib/itemDetailApi'
import { getCategoryColor } from '@renderer/lib/categoryIcons'
import { formatFullValue, getDemandColor, getItemImagePath, handleImageError } from '@renderer/lib/itemValueUtils'
import type { Item } from '@shared/item'

type SortOption = { value: string; label: string }

let sortsCache: Promise<SortOption[]> | null = null

function loadSorts(): Promise<SortOption[]> {
  sortsCache ??= itemsApi
    .similarSorts()
    .then((groups) => groups.flatMap((group) => group.sorts))
    .catch(() => {
      sortsCache = null
      return []
    })
  return sortsCache
}

function SimilarCard({ item }: { item: Item }): React.JSX.Element {
  const { selectItem } = useValues()
  const demand = !item.demand || item.demand === 'N/A' ? 'Unknown' : item.demand

  return (
    <button
      type="button"
      onClick={() => selectItem(item.id)}
      className="group relative flex min-h-24 flex-1 overflow-hidden rounded-xl border border-border-card bg-tertiary-bg text-left transition-colors hover:border-border-focus/60"
    >
      <img
        src={getItemImagePath(item.type, item.name)}
        alt=""
        onError={handleImageError}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="relative mt-auto flex w-full min-w-0 flex-col gap-1 p-2.5">
        <p className="truncate text-sm font-semibold text-white">{item.name}</p>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate font-semibold text-white/90">{formatFullValue(item.cash_value)}</span>
          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] leading-none font-bold ${getDemandColor(demand)}`}>
            {demand}
          </span>
        </div>
        <span className="text-[10px] font-medium" style={{ color: getCategoryColor(item.type) }}>
          {item.type}
        </span>
      </div>
    </button>
  )
}

export function ItemSimilarSheet({ item }: { item: Item }): React.JSX.Element {
  const [sorts, setSorts] = useState<SortOption[] | null>(null)
  const [sort, setSort] = useState<string | null>(null)
  const [similar, setSimilar] = useState<Item[] | null>(null)

  useEffect(() => {
    void loadSorts().then((options) => {
      setSorts(options)
      setSort((current) => current ?? options[0]?.value ?? '')
    })
  }, [])

  useEffect(() => {
    if (sort === null) return undefined
    let cancelled = false
    setSimilar(null)
    itemsApi
      .similar(item.id, sort || undefined)
      .then((res) => res.items ?? [])
      .catch(() => [])
      .then((items) => !cancelled && setSimilar(items.filter((candidate) => candidate.id !== item.id)))
    return () => {
      cancelled = true
    }
  }, [item.id, sort])

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l border-border-primary bg-secondary-bg">
      <p className="px-4 pt-4 pb-2 text-xs font-bold tracking-wide text-quaternary-text uppercase">Similar Items</p>
      {sorts && sorts.length > 0 && sort && (
        <div className="px-2 pb-2">
          <FilterMenu label="Sort" value={sort} options={sorts} onChange={setSort} />
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {!similar ? (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="min-h-24 flex-1 animate-pulse rounded-xl bg-quaternary-bg/70" />
          ))
        ) : similar.length === 0 ? (
          <p className="py-8 text-center text-xs text-quaternary-text">No similar items found.</p>
        ) : (
          similar.map((candidate) => <SimilarCard key={candidate.id} item={candidate} />)
        )}
      </div>
    </aside>
  )
}
