import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { usersApi } from '@renderer/lib/usersApi'
import type { ConversationSummary } from '@renderer/lib/messagesApi'
import { useUserProfiles } from '@renderer/hooks/useUserProfiles'
import { UserAvatar, UserAvatarWithPresence } from '@renderer/components/messages/UserAvatar'
import { UserNameSkeleton } from '@renderer/components/messages/UserNameSkeleton'
import { UserProfilePopover } from '@renderer/components/user/UserProfilePopover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import type { UserProfile } from '@shared/user'
import { KNOWN_ROBLOX_GAMES } from '@shared/robloxGames'
import { FLOATING_PANEL_SURFACE } from '@renderer/lib/floatingPanelSurface'

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

function NewConversationSearch({ onSelect }: { onSelect: (userId: string) => void }): React.JSX.Element {
  const { token } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserProfile[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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
    onSelect(user.id)
    setQuery('')
    setResults([])
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
      </div>
      {open && query.trim() && (
        <div className={`absolute inset-x-2 top-full z-10 mt-1 max-h-72 overflow-y-auto ${FLOATING_PANEL_SURFACE}`}>
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
  )
}

interface ConversationListProps {
  conversations: ConversationSummary[]
  loading: boolean
  error: string | null
  selectedId: string | null
  onSelect: (recipientId: string) => void
  onHide: (recipientId: string) => Promise<void>
  onUnhide: (recipientId: string) => Promise<void>
}

const UNDO_TIMEOUT_MS = 5000

export function ConversationList({
  conversations,
  loading,
  error,
  selectedId,
  onSelect,
  onHide,
  onUnhide
}: ConversationListProps): React.JSX.Element {
  const profiles = useUserProfiles(conversations.map((c) => c.recipient_id))
  const { typingUserIds, robloxActivity } = useRealtime()
  const [lastHidden, setLastHidden] = useState<{ id: string; label: string } | null>(null)
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
    }
  }, [])

  const handleHide = (recipientId: string, label: string): void => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
    setLastHidden({ id: recipientId, label })
    undoTimeoutRef.current = setTimeout(() => setLastHidden(null), UNDO_TIMEOUT_MS)
    void onHide(recipientId)
  }

  const handleUndo = (): void => {
    if (!lastHidden) return
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
    void onUnhide(lastHidden.id)
    setLastHidden(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <NewConversationSearch onSelect={onSelect} />
      <div className="px-3 py-2.5">
        <h1 className="text-xs font-bold uppercase tracking-wide text-quaternary-text">Messages</h1>
      </div>

      {lastHidden && (
        <div className="mx-2 mb-1.5 flex items-center justify-between gap-2 rounded-md bg-tertiary-bg px-2.5 py-1.5 text-xs text-secondary-text">
          <span className="min-w-0 truncate">Hid {lastHidden.label}</span>
          <button
            type="button"
            onClick={handleUndo}
            className="shrink-0 font-semibold text-link hover:text-link-hover"
          >
            Undo
          </button>
        </div>
      )}

      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {loading && conversations.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-quaternary-text">Loading…</p>
        )}

        {error && <p className="px-2 py-6 text-center text-xs text-form-error">{error}</p>}

        {!loading && !error && conversations.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-quaternary-text">No conversations yet.</p>
        )}

        {conversations.map(({ recipient_id, unread_count }) => {
          const profile = profiles.get(recipient_id)
          const label = profile?.username || profile?.name
          const isSelected = selectedId === recipient_id
          const activity = robloxActivity.get(recipient_id)
          const gameName = activity?.placeId ? (KNOWN_ROBLOX_GAMES[activity.placeId] ?? 'Roblox') : null
          return (
            <div
              key={recipient_id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(recipient_id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(recipient_id)
                }
              }}
              title={recipient_id}
              className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors ${isSelected
                ? 'bg-button-secondary/45 text-form-button-text'
                : 'hover:bg-quaternary-bg'
                }`}
            >
              <UserProfilePopover userId={recipient_id} profile={profile}>
                <button type="button" className="shrink-0 rounded-full">
                  <UserAvatarWithPresence
                    id={recipient_id}
                    profile={profile}
                    typing={typingUserIds.has(recipient_id)}
                    className="h-8 w-8"
                  />
                </button>
              </UserProfilePopover>

              <div className="min-w-0 flex-1">
                {label ? (
                  <span
                    className={`block truncate text-[15px] font-medium ${isSelected ? 'text-form-button-text' : 'text-primary-text'
                      }`}
                  >
                    {label}
                  </span>
                ) : (
                  <UserNameSkeleton />
                )}
                {gameName && (
                  <span className="block truncate text-[11px] text-status-success-vibrant">
                    Playing {gameName}
                  </span>
                )}
              </div>

              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                {unread_count > 0 && (
                  <span
                    className={`pointer-events-none absolute inset-0 flex items-center justify-center opacity-100 transition-opacity group-hover:opacity-0`}
                  >
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${isSelected
                        ? 'bg-form-button-text/20 text-form-button-text'
                        : 'bg-card-tag-bg text-card-tag-text'
                        }`}
                    >
                      {unread_count > 99 ? '99+' : unread_count}
                    </span>
                  </span>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleHide(recipient_id, label ?? `User #${recipient_id.slice(-6)}`)
                      }}
                      aria-label={`Hide conversation with ${label ?? 'this user'}`}
                      className={`flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100 ${isSelected
                        ? 'text-form-button-text hover:bg-black/10'
                        : 'text-tertiary-text hover:bg-black/10 hover:text-primary-text'
                        }`}
                    >
                      <XIcon className="h-4.5 w-4.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Hide conversation</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
