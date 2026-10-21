import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { usersApi } from '@renderer/lib/usersApi'
import { UserAvatar } from '@renderer/components/messages/UserAvatar'
import { FLOATING_PANEL_SURFACE } from '@renderer/lib/floatingPanelSurface'
import type { UserProfile } from '@shared/user'

function XIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
    </svg>
  )
}

const SEARCH_DEBOUNCE_MS = 300

/** Debounced user search; empty results for an empty query. */
export function useUserSearch(query: string): {
  results: UserProfile[]
  searchLoading: boolean
  searchError: string | null
  clearResults: () => void
} {
  const { token } = useAuth()
  const [results, setResults] = useState<UserProfile[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !query.trim()) {
      setResults([])
      setSearchError(null)
      setSearchLoading(false)
      return undefined
    }

    let cancelled = false
    setSearchLoading(true)
    const timeout = setTimeout(() => {
      usersApi
        .search(token, query.trim())
        .then((users) => {
          if (cancelled) return
          setResults(users)
          setSearchError(null)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setSearchError(err instanceof Error ? err.message : 'Search failed')
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [token, query])

  return { results, searchLoading, searchError, clearResults: () => setResults([]) }
}

export function UserSearch({ onSelect }: { onSelect: (user: UserProfile) => void }): React.JSX.Element {
  const [query, setQuery] = useState('')
  const { results, searchLoading, searchError, clearResults } = useUserSearch(query)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (user: UserProfile): void => {
    onSelect(user)
    setQuery('')
    clearResults()
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative shrink-0 px-2 pt-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-secondary-text" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Find a Conversation"
          className="h-10 w-full rounded-xl border border-border-card bg-secondary-bg py-2 pr-8 pl-9 text-sm text-primary-text placeholder-secondary-text transition-colors focus:border-button-info focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
            aria-label="Clear search"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-secondary-text transition-colors hover:text-primary-text"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
        {open && query.trim() && (
          <div className={`absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto ${FLOATING_PANEL_SURFACE}`}>
            {searchLoading ? (
              <p className="px-3 py-3 text-center text-xs text-quaternary-text">Searching…</p>
            ) : searchError ? (
              <p className="px-3 py-3 text-center text-xs text-form-error">{searchError}</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-quaternary-text">No users found.</p>
            ) : (
              results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-quaternary-bg"
                >
                  <UserAvatar id={user.id} profile={user} className="h-8 w-8" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary-text">
                    {user.username || user.name}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
