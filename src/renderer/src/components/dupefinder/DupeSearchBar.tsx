import { useEffect, useRef, useState } from 'react'
import { dupesApi } from '@renderer/lib/dupesApi'
import { RobloxAvatar } from '@renderer/components/dupefinder/RobloxAvatar'
import { FLOATING_PANEL_SURFACE } from '@renderer/lib/floatingPanelSurface'
import type { DupeOwnerSearchResult } from '@shared/dupe'

const SUGGESTIONS_DEBOUNCE_MS = 300
const SUGGESTIONS_LIMIT = 15

function SearchIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

export function DupeSearchBar({
  initialValue = '',
  loading = false,
  onSearch
}: {
  initialValue?: string
  loading?: boolean
  onSearch: (input: string) => void
}): React.JSX.Element {
  const [value, setValue] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<DupeOwnerSearchResult[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const isUserEditRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    isUserEditRef.current = false
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    const query = value.trim()
    if (!isUserEditRef.current || !query) {
      setSuggestions([])
      setSuggestionsOpen(false)
      setSuggestionsLoading(false)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    const requestId = ++requestIdRef.current
    setSuggestionsLoading(true)
    setSuggestionsOpen(true)

    debounceRef.current = setTimeout(() => {
      dupesApi
        .searchOwners(query, SUGGESTIONS_LIMIT, controller.signal)
        .then((results) => {
          if (controller.signal.aborted || requestIdRef.current !== requestId) return
          setSuggestions(results)
          setHighlightedIndex(-1)
        })
        .catch(() => {
          if (!controller.signal.aborted && requestIdRef.current === requestId) setSuggestions([])
        })
        .finally(() => {
          if (!controller.signal.aborted && requestIdRef.current === requestId) setSuggestionsLoading(false)
        })
    }, SUGGESTIONS_DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const submit = (input: string): void => {
    const trimmed = input.trim()
    if (!trimmed) return
    setSuggestionsOpen(false)
    onSearch(trimmed)
  }

  const selectOwner = (owner: DupeOwnerSearchResult): void => {
    isUserEditRef.current = false
    setSuggestions([])
    setSuggestionsOpen(false)
    setValue(owner.name)
    onSearch(owner.id)
  }

  const showDropdown = suggestionsOpen && value.trim().length > 0

  return (
    <div ref={containerRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(value)
        }}
      >
        <div className="relative flex items-center">
          {loading ? (
            <div className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
          ) : (
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-secondary-text" />
          )}
          <input
            type="search"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={value}
            onChange={(e) => {
              isUserEditRef.current = true
              setValue(e.target.value)
            }}
            onKeyDown={(e) => {
              if (!suggestionsOpen || suggestions.length === 0) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setHighlightedIndex((prev) => (prev + 1) % suggestions.length)
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
              } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                e.preventDefault()
                selectOwner(suggestions[highlightedIndex])
              } else if (e.key === 'Escape') {
                setSuggestionsOpen(false)
              }
            }}
            onFocus={() => {
              if (isUserEditRef.current && value.trim()) setSuggestionsOpen(true)
            }}
            placeholder="Search Duplicates"
            disabled={loading}
            required
            className="h-10 w-full rounded-xl border border-border-card bg-secondary-bg py-2 pr-8 pl-9 text-sm text-primary-text placeholder-secondary-text transition-colors focus:border-button-info focus:outline-none disabled:opacity-60 [&::-webkit-search-cancel-button]:hidden"
          />
          {value && (
            <button
              type="button"
              onClick={() => setValue('')}
              aria-label="Clear search"
              className="absolute right-2.5 text-secondary-text transition-colors hover:text-primary-text"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {showDropdown && (
        <ul className={`absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto ${FLOATING_PANEL_SURFACE}`}>
          {suggestionsLoading ? (
            <li className="px-4 py-3 text-sm text-secondary-text">Searching…</li>
          ) : suggestions.length === 0 ? (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => submit(value)}
                className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-tertiary-bg"
              >
                <span className="text-sm font-medium text-primary-text">
                  No autofill match for &quot;{value.trim()}&quot; — search anyway
                </span>
                <span className="text-xs text-secondary-text">
                  Autofill needs the exact start of a name and can lag behind new results
                </span>
              </button>
            </li>
          ) : (
            suggestions.map((owner, index) => (
              <li key={owner.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectOwner(owner)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${index === highlightedIndex ? 'bg-tertiary-bg' : 'hover:bg-tertiary-bg'
                    }`}
                >
                  <RobloxAvatar userId={owner.id} label={owner.name} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary-text">{owner.displayName}</p>
                    <p className="truncate text-xs text-secondary-text">@{owner.name}</p>
                  </div>
                  <span className="shrink-0 text-xs text-secondary-text">
                    {owner.total_dupes} {owner.total_dupes === '1' ? 'dupe' : 'dupes'}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
