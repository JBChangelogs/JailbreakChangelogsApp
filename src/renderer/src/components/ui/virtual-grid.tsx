import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface VirtualGridProps<T> {
  items: T[]
  getKey: (item: T) => string | number
  renderItem: (item: T) => React.ReactNode
  /** The element that scrolls; the grid can sit anywhere inside it, below other content. */
  scrollElement: HTMLElement | null
  /** Columns are as many of these as fit, stretched to fill the row (like auto-fill/minmax). */
  minColumnWidth: number
  gap?: number
  /** A typical row's height; rows are measured once they render. */
  estimateRowHeight: number
  /** Called when the last rows come into view, to load another page. */
  onEndReached?: () => void
}

/** A responsive card grid that only mounts the rows near the viewport, so long lists scroll smoothly. */
export function VirtualGrid<T>({
  items,
  getKey,
  renderItem,
  scrollElement,
  minColumnWidth,
  gap = 12,
  estimateRowHeight,
  onEndReached
}: VirtualGridProps<T>): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  // Where the grid starts inside the scroll element; content above it (like the calculator's
  // panels) changes size as the user works.
  const [scrollMargin, setScrollMargin] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !scrollElement) return undefined
    const measure = (): void => {
      setWidth(el.clientWidth)
      setScrollMargin(el.getBoundingClientRect().top - scrollElement.getBoundingClientRect().top + scrollElement.scrollTop)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    for (const child of Array.from(scrollElement.children)) observer.observe(child)
    return () => observer.disconnect()
  }, [scrollElement])

  const columns = Math.max(1, Math.floor((width + gap) / (minColumnWidth + gap)))
  const rowCount = Math.ceil(items.length / columns)

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollElement,
    estimateSize: () => estimateRowHeight + gap,
    overscan: 3,
    scrollMargin
  })
  const rows = virtualizer.getVirtualItems()
  const lastIndex = rows[rows.length - 1]?.index

  useEffect(() => {
    if (lastIndex != null && lastIndex >= rowCount - 2) onEndReached?.()
  }, [lastIndex, rowCount, onEndReached])

  return (
    <div ref={ref} className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
      {width > 0 &&
        rows.map((row) => (
          <div
            key={row.key}
            data-index={row.index}
            ref={virtualizer.measureElement}
            className="absolute inset-x-0 top-0 grid"
            style={{
              transform: `translateY(${row.start - scrollMargin}px)`,
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap,
              paddingBottom: gap
            }}
          >
            {items.slice(row.index * columns, (row.index + 1) * columns).map((item) => (
              <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
            ))}
          </div>
        ))}
    </div>
  )
}
