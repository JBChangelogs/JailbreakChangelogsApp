import { useEffect, useRef } from 'react'
import { useValues } from '@renderer/contexts/ValuesContext'
import { ItemCard } from '@renderer/components/values/ItemCard'
import { ItemDetailScreen } from '@renderer/components/values/ItemDetailScreen'

export function ValuesScreen(): React.JSX.Element {
  const { items, total, loading, error, hasMore, loadMore, selectedItem } = useValues()
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = scrollRef.current
    if (!sentinel || !root) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { root, rootMargin: '600px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore, hasMore])

  if (selectedItem) return <ItemDetailScreen item={selectedItem} />

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border-primary px-5 py-4">
        <h2 className="text-sm font-semibold text-primary-text">Values</h2>
        <span className="text-xs text-tertiary-text">
          {items.length} of {total} shown
        </span>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
          </div>
        ) : error ? (
          <p className="pt-10 text-center text-sm text-status-error">Failed to load the value list.</p>
        ) : items.length === 0 ? (
          <p className="pt-10 text-center text-sm text-quaternary-text">No items match the current filters.</p>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(275px,1fr))] gap-3">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
