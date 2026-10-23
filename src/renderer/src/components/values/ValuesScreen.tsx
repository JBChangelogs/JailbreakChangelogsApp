import { useState } from 'react'
import { useValues } from '@renderer/contexts/ValuesContext'
import { VirtualGrid } from '@renderer/components/ui/virtual-grid'
import { ItemCard } from '@renderer/components/values/ItemCard'
import { ItemDetailScreen } from '@renderer/components/values/ItemDetailScreen'

export function ValuesScreen(): React.JSX.Element {
  const { items, total, loading, error, hasMore, loadMore, selectedItem } = useValues()
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null)

  if (selectedItem) return <ItemDetailScreen item={selectedItem} />

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border-primary px-5 py-4">
        <h2 className="text-sm font-semibold text-primary-text">Values</h2>
        <span className="text-xs text-tertiary-text">
          {items.length} of {total} shown
        </span>
      </div>

      <div ref={setScrollElement} className="min-h-0 flex-1 overflow-y-auto p-4">
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
            <VirtualGrid
              items={items}
              getKey={(item) => item.id}
              renderItem={(item) => <ItemCard item={item} />}
              scrollElement={scrollElement}
              minColumnWidth={240}
              maxColumnWidth={320}
              estimateRowHeight={420}
              onEndReached={loadMore}
            />
            {hasMore && (
              <div className="flex justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
