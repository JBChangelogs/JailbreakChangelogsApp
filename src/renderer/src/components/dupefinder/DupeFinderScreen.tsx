import { useEffect, useRef, useState } from 'react'
import { originalOwnerId, useDupeFinder } from '@renderer/contexts/DupeFinderContext'
import { DupeItemCard } from '@renderer/components/dupefinder/DupeItemCard'
import { DupeCompareModal } from '@renderer/components/dupefinder/DupeCompareModal'
import { userDisplay } from '@renderer/lib/dupeDisplay'
import { EmptyState } from '@renderer/components/ui/empty-state'
import type { Item } from '@shared/item'

const PAGE_SIZE = 20

export function DupeFinderScreen(): React.JSX.Element {
  const { state, sortedData, duplicateCounts, duplicateOrders, itemsMap, ownerProfiles, selectItem, openCompare } = useDupeFinder()
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
      <div className="flex h-[57px] shrink-0 items-center justify-between border-b border-border-primary px-5">
        <h2 className="text-sm font-semibold text-primary-text">Dupe Finder</h2>
        {state.status === 'success' && (
          <span className="text-xs text-tertiary-text">
            {Math.min(visibleCount, sortedData.length)} of {sortedData.length} shown
          </span>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-5">
        {state.status === 'idle' && (
          <EmptyState
            status={{
              icon: 'search',
              tone: 'neutral',
              title: 'Check an account for dupes',
              description: 'Search a Roblox username or ID in the sidebar to see any duped items tied to that account.'
            }}
          />
        )}

        {state.status === 'loading' && (
          <EmptyState
            status={{
              icon: 'spinner',
              tone: 'neutral',
              title: 'Searching for dupes',
              description: 'Checking this account against the dupe records.'
            }}
          />
        )}

        {state.status === 'not-found' && (
          <EmptyState status={{ icon: 'userMinus', tone: 'error', title: 'Account not found', description: state.message }} />
        )}

        {state.status === 'no-dupes' && (
          <EmptyState
            status={{
              icon: 'shieldCheck',
              tone: 'neutral',
              title: 'No duped items found',
              description: `No duplicated items have been recorded for ${userDisplay(state.user, state.robloxId)} yet.`
            }}
          />
        )}

        {state.status === 'success' &&
          (sortedData.length === 0 ? (
            <EmptyState
              status={{
                icon: 'funnel',
                tone: 'neutral',
                title: 'No items match your filters',
                description: `${state.items.length} duped ${state.items.length === 1 ? 'item is' : 'items are'} hidden. Try changing the search or categories in the sidebar.`
              }}
            />
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(275px,1fr))] gap-4">
                {visibleItems.map((item) => {
                  const itemData = itemsMap.get(item.item_id) as Item | undefined
                  const key = `${item.categoryTitle}-${item.title}`
                  const isDuplicate = (duplicateCounts.get(key) ?? 0) > 1
                  const ownerId = originalOwnerId(item, state.robloxId)
                  return (
                    <DupeItemCard
                      key={item.id}
                      item={item}
                      itemData={itemData}
                      ownerId={ownerId}
                      ownerName={userDisplay(ownerProfiles[ownerId], ownerId)}
                      duplicateNumber={isDuplicate ? duplicateOrders.get(item.id) : undefined}
                      onHistory={() => selectItem(item)}
                      onCompare={() => openCompare(item.id)}
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
