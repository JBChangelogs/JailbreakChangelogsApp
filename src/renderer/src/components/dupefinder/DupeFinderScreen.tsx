import { useEffect, useRef, useState } from 'react'
import { currentOwnerId, useDupeFinder } from '@renderer/contexts/DupeFinderContext'
import { DupeItemCard } from '@renderer/components/dupefinder/DupeItemCard'
import { DupeCompareModal } from '@renderer/components/dupefinder/DupeCompareModal'
import { userDisplay } from '@renderer/lib/dupeDisplay'
import type { Item } from '@shared/item'

const PAGE_SIZE = 20

export function DupeFinderScreen(): React.JSX.Element {
  const { state, sortedData, duplicateCounts, duplicateOrders, itemsMap, ownerProfiles, selectItem } = useDupeFinder()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [sortedData])

  useEffect(() => {
    const sentinel = sentinelRef.current
    const root = scrollRef.current
    if (!sentinel || !root) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sortedData.length))
        }
      },
      { root, rootMargin: '600px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sortedData.length])

  const visibleItems = sortedData.slice(0, visibleCount)
  const hasMore = visibleCount < sortedData.length

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border-primary px-5 py-4">
        <h2 className="text-sm font-semibold text-primary-text">Dupe Finder</h2>
        {state.status === 'success' && (
          <span className="text-xs text-tertiary-text">
            {Math.min(visibleCount, sortedData.length)} of {sortedData.length} shown
          </span>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-5">
        {state.status === 'idle' && (
          <p className="pt-10 text-center text-sm text-quaternary-text">
            Enter a Roblox ID or username in the sidebar to check for any duped items associated with that account.
          </p>
        )}

        {state.status === 'loading' && (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
          </div>
        )}

        {state.status === 'not-found' && (
          <div className="rounded-2xl border border-border-card bg-secondary-bg p-6 text-center">
            <p className="mb-1 text-base font-semibold text-status-error">Not Found</p>
            <p className="text-sm text-secondary-text">{state.message}</p>
          </div>
        )}

        {state.status === 'no-dupes' && (
          <div className="rounded-2xl border border-border-card bg-secondary-bg p-5 text-center">
            <p className="font-medium text-primary-text">No duped items found</p>
            <p className="mt-1 text-sm text-secondary-text">No duplicated items have been recorded for this user yet.</p>
          </div>
        )}

        {state.status === 'success' &&
          (sortedData.length === 0 ? (
            <p className="py-8 text-center text-sm text-quaternary-text">No items match the current filters.</p>
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(275px,1fr))] gap-4">
                {visibleItems.map((item) => {
                  const itemData = itemsMap.get(item.item_id) as Item
                  const key = `${item.categoryTitle}-${item.title}`
                  const isDuplicate = (duplicateCounts.get(key) ?? 0) > 1
                  const ownerId = currentOwnerId(item, state.robloxId)
                  return (
                    <DupeItemCard
                      key={item.id}
                      item={item}
                      itemData={itemData}
                      ownerId={ownerId}
                      ownerName={userDisplay(ownerProfiles[ownerId], ownerId)}
                      duplicateNumber={isDuplicate ? duplicateOrders.get(item.id) : undefined}
                      onClick={() => selectItem(item)}
                    />
                  )
                })}
              </div>
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
                </div>
              )}
            </>
          ))}
      </div>

      <DupeCompareModal />
    </div>
  )
}
