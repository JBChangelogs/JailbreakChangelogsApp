import { useEffect, useRef, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useValues } from '@renderer/contexts/ValuesContext'
import { itemsApi } from '@renderer/lib/itemDetailApi'
import { getCategoryColor } from '@renderer/lib/categoryIcons'
import { FLOATING_PANEL_SURFACE } from '@renderer/lib/floatingPanelSurface'
import { formatFullValue, getItemImagePath, handleImageError } from '@renderer/lib/itemValueUtils'
import type { Item } from '@shared/item'

const SEARCH_DEBOUNCE_MS = 250
const RESULT_LIMIT = 8

function SearchIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
    </svg>
  )
}

export function ItemSearchSelect({ item }: { item: Item }): React.JSX.Element {
  const { selectItem } = useValues()
  const [query, setQuery] = useState<string | null>(null)
  const [results, setResults] = useState<Item[] | null>(null)
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const editing = query !== null
  const trimmed = query?.trim() ?? ''

  useEffect(() => {
    if (!editing) {
      setResults(null)
      return undefined
    }
    let cancelled = false
    const timer = setTimeout(
      () => {
        itemsApi
          .list({ page: 1, sort: 'cash-desc', filters: [], search: trimmed })
          .then((page) => page.items.slice(0, RESULT_LIMIT))
          .catch(() => [])
          .then((items) => {
            if (cancelled) return
            setResults(items)
            setHighlighted(0)
          })
      },
      trimmed ? SEARCH_DEBOUNCE_MS : 0
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [editing, trimmed])

  const close = (): void => {
    setQuery(null)
    setResults(null)
  }

  const pick = (next: Item): void => {
    close()
    inputRef.current?.blur()
    if (next.id !== item.id) selectItem(next.id)
  }

  return (
    <div className="relative">
      {editing ? (
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-secondary-text" />
      ) : (
        <img
          src={getItemImagePath(item.type, item.name)}
          alt=""
          onError={handleImageError}
          className="pointer-events-none absolute top-px left-px h-[38px] w-[68px] rounded-l-[11px] border-r border-border-card object-cover"
          draggable={false}
        />
      )}
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={!!results}
        aria-label="Search items"
        autoComplete="off"
        spellCheck={false}
        value={query ?? item.name}
        onFocus={(e) => {
          setQuery('')
          requestAnimationFrame(() => e.target.select())
        }}
        onBlur={close}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            close()
            e.currentTarget.blur()
            return
          }
          if (!results?.length) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlighted((i) => (i + 1) % results.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlighted((i) => (i - 1 + results.length) % results.length)
          } else if (e.key === 'Enter') {
            e.preventDefault()
            pick(results[highlighted])
          }
        }}
        placeholder="Search items..."
        className={`h-10 w-full rounded-xl border border-border-card bg-secondary-bg py-2 pr-3 text-sm font-medium text-primary-text placeholder-secondary-text transition-colors focus:border-button-info focus:outline-none ${editing ? 'pl-9' : 'pl-[82px]'}`}
      />

      {results && (
        <ul
          className={`absolute inset-x-0 top-full z-30 mt-1 max-h-96 space-y-1 overflow-y-auto p-1 ${FLOATING_PANEL_SURFACE}`}
        >
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-secondary-text">No items found</li>
          ) : (
            results.map((result, index) => (
              <li key={result.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(result)}
                      onMouseEnter={() => setHighlighted(index)}
                      className={`flex h-12 w-full items-center gap-2.5 overflow-hidden rounded-xl border pr-2.5 text-left transition-colors ${index === highlighted ? 'border-border-focus/60 bg-tertiary-bg' : 'border-border-card bg-secondary-bg'}`}
                    >
                      <img
                        src={getItemImagePath(result.type, result.name)}
                        alt=""
                        onError={handleImageError}
                        className="h-full w-[82px] shrink-0 border-r border-border-card object-cover"
                        draggable={false}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-primary-text">{result.name}</span>
                        <span className="block truncate text-xs text-secondary-text">
                          {formatFullValue(result.cash_value)}
                        </span>
                      </span>
                      {result.id === item.id && <span className="shrink-0 text-xs text-tertiary-text">Viewing</span>}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <span style={{ color: getCategoryColor(result.type) }}>{result.type}</span>
                  </TooltipContent>
                </Tooltip>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
