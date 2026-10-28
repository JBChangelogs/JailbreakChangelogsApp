import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { useAuth } from '@renderer/contexts/AuthContext'
import { itemDetailApi } from '@renderer/lib/itemDetailApi'
import { SuggestionRow } from '@renderer/components/values/itemdetail/SuggestionRow'
import type { ValueSuggestion } from '@shared/itemDetail'

const COPY = {
  change: {
    title: 'Item Changes',
    empty: 'No value changes have been recorded for this item yet.',
    error: 'Failed to load changes.'
  },
  suggestion: {
    title: 'Item Suggestions',
    empty: 'No value suggestions have been submitted for this item yet.',
    error: 'Failed to load suggestions.'
  }
}

function RowSkeleton(): React.JSX.Element {
  return (
    <div className="animate-pulse space-y-3 rounded-xl border border-border-card bg-secondary-bg p-4">
      <div className="flex gap-2">
        <div className="h-6 w-12 rounded-md bg-quaternary-bg/70" />
        <div className="h-6 w-24 rounded-md bg-quaternary-bg/70" />
        <div className="ml-auto h-6 w-20 rounded-md bg-quaternary-bg/70" />
      </div>
      <div className="h-5 w-56 rounded bg-quaternary-bg/70" />
      <div className="h-3 w-full rounded bg-quaternary-bg/70" />
      <div className="h-3 w-2/3 rounded bg-quaternary-bg/70" />
      <div className="flex items-center gap-2 border-t border-border-card pt-3">
        <div className="h-7 w-7 rounded-full bg-quaternary-bg/70" />
        <div className="h-3 w-32 rounded bg-quaternary-bg/70" />
      </div>
    </div>
  )
}

export function ItemSuggestionsList({ itemId, kind }: { itemId: number; kind: 'change' | 'suggestion' }): React.JSX.Element {
  const { token } = useAuth()
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<ValueSuggestion[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const copy = COPY[kind]

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    const request = kind === 'change' ? itemDetailApi.changelogs(itemId, page) : itemDetailApi.suggestions(itemId, page, token)
    request
      .then((result) => {
        if (cancelled) return
        setItems((prev) => (page === 1 ? (result.items ?? []) : [...prev, ...(result.items ?? [])]))
        setTotal(result.total)
        setTotalPages(result.total_pages)
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [itemId, kind, page, token, attempt])

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-primary-text">
        {copy.title}
        {total !== null && <span className="ml-2 text-sm font-normal text-secondary-text">{total.toLocaleString()}</span>}
      </h3>

      {items.map((entry) => (
        <SuggestionRow key={entry.id} suggestion={entry} kind={kind} />
      ))}

      {loading && Array.from({ length: page === 1 ? 3 : 1 }, (_, i) => <RowSkeleton key={i} />)}

      {error ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <p className="text-sm text-status-error">{copy.error}</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
        </div>
      ) : (
        !loading &&
        items.length === 0 && (
          <p className="rounded-xl border border-border-card bg-secondary-bg py-8 text-center text-sm text-quaternary-text">
            {copy.empty}
          </p>
        )
      )}

      {!loading && !error && page < totalPages && (
        <div className="flex justify-center pt-1">
          <Button type="button" size="sm" variant="secondary" onClick={() => setPage((p) => p + 1)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
