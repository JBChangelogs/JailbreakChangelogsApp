import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { itemDetailApi } from '@renderer/lib/itemDetailApi'
import { SuggestionRow } from '@renderer/components/values/itemdetail/SuggestionRow'
import type { SuggestionsPage } from '@shared/itemDetail'

export function ItemSuggestionsTab({ itemId }: { itemId: number }): React.JSX.Element {
  const { token } = useAuth()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<SuggestionsPage | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(false)
    itemDetailApi
      .suggestions(itemId, page, token)
      .then((result) => !cancelled && setData(result))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [itemId, page, token])

  if (error) return <p className="py-8 text-center text-sm text-status-error">Failed to load suggestions.</p>
  if (!data) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
      </div>
    )
  }
  const items = data.items ?? []
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-quaternary-text">No value suggestions for this item yet.</p>
  }

  return (
    <div className="space-y-3">
      {items.map((suggestion) => (
        <SuggestionRow key={suggestion.id} suggestion={suggestion} />
      ))}

      {data.total_pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-xs font-semibold text-link hover:text-link-hover disabled:pointer-events-none disabled:text-tertiary-text"
          >
            Previous
          </button>
          <span className="text-xs text-quaternary-text">
            Page {page} of {data.total_pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            disabled={page >= data.total_pages}
            className="text-xs font-semibold text-link hover:text-link-hover disabled:pointer-events-none disabled:text-tertiary-text"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
