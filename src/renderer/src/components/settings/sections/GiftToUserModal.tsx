import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { usersApi } from '@renderer/lib/usersApi'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { SearchInput } from '@renderer/components/ui/search-input'
import type { UserProfile } from '@shared/user'

const SEARCH_DEBOUNCE_MS = 300

interface GiftToUserModalProps {
  levelLabel: string
  onCancel: () => void
  onConfirm: (recipient: UserProfile) => Promise<void>
}

export function GiftToUserModal({ levelLabel, onCancel, onConfirm }: GiftToUserModalProps): React.JSX.Element {
  const { token } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<UserProfile | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !query.trim()) {
      setResults([])
      return undefined
    }
    setSearching(true)
    const timeout = setTimeout(() => {
      usersApi
        .search(token, query, 8)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [token, query])

  const handleConfirm = async (): Promise<void> => {
    if (!selected) return
    setSending(true)
    setError(null)
    try {
      await onConfirm(selected)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send gift')
      setSending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Gift {levelLabel}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {selected ? (
            <div className="flex items-center gap-3 rounded-md bg-quaternary-bg px-3 py-2.5">
              {selected.avatar && (
                <img src={selected.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-primary-text">{selected.username}</span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs font-semibold text-link hover:text-link-hover"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <SearchInput value={query} onChange={setQuery} placeholder="Search by username…" />
              <div className="mt-2 space-y-1">
                {searching && <p className="px-1 py-2 text-xs text-quaternary-text">Searching…</p>}
                {!searching &&
                  results.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => setSelected(result)}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-quaternary-bg"
                    >
                      {result.avatar && (
                        <img src={result.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm text-primary-text">{result.username}</span>
                    </button>
                  ))}
                {!searching && query.trim() && results.length === 0 && (
                  <p className="px-1 py-2 text-xs text-quaternary-text">No users found.</p>
                )}
              </div>
            </>
          )}
          {error && <p className="mt-2 text-xs text-form-error">{error}</p>}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border-primary px-5 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={sending}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => void handleConfirm()} disabled={!selected || sending}>
            {sending ? 'Sending…' : 'Send Gift'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
