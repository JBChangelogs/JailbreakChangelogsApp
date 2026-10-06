import { useEffect, useState } from 'react'
import { ItemCard } from '@renderer/components/values/ItemCard'
import { itemsApi } from '@renderer/lib/itemDetailApi'
import type { Item } from '@shared/item'

const SIMILAR_COUNT = 12

export function ItemSimilarTab({ item }: { item: Item }): React.JSX.Element {
  const [similar, setSimilar] = useState<Item[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setSimilar(null)
    itemsApi
      .similar(item.id)
      .then((res) => (Array.isArray(res) ? res : ((res as { items?: Item[] }).items ?? [])))
      .catch(() => [])
      .then((items) => {
        if (!cancelled) setSimilar(items.filter((c) => c.id !== item.id).slice(0, SIMILAR_COUNT))
      })
    return () => {
      cancelled = true
    }
  }, [item.id])

  if (!similar) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
      </div>
    )
  }

  if (similar.length === 0) {
    return <p className="py-8 text-center text-sm text-quaternary-text">No similar items found.</p>
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
      {similar.map((candidate) => (
        <ItemCard key={candidate.id} item={candidate} />
      ))}
    </div>
  )
}
