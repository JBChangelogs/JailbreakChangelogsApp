import { useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useTrades } from '@renderer/contexts/TradesContext'
import { tradesApi } from '@renderer/lib/tradesApi'
import { TradeAdCard } from '@renderer/components/trading/TradeAdCard'
import { CreateTradeAdScreen } from '@renderer/components/trading/CreateTradeAdScreen'
import { TradeAdDetailScreen } from '@renderer/components/trading/TradeAdDetailScreen'
import { Button } from '@renderer/components/ui/button'

export function TradesScreen(): React.JSX.Element {
  const { token } = useAuth()
  const { ads, loading, error, page, totalPages, setPage, bumpRefreshToken, refresh, view, setView } = useTrades()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async (id: number): Promise<void> => {
    if (!token) return
    if (!window.confirm('Delete this trade ad? This cannot be undone.')) return
    try {
      await tradesApi.delete(token, id)
      bumpRefreshToken()
      refresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete trade ad')
    }
  }

  if (view.type === 'create') {
    return <CreateTradeAdScreen />
  }

  if (view.type === 'detail') {
    return <TradeAdDetailScreen tradeId={view.id} onBack={() => setView({ type: 'list' })} />
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border-primary px-5 py-4">
        <h2 className="text-sm font-semibold text-primary-text">Trade Ads</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading && ads.length === 0 && <p className="text-center text-sm text-quaternary-text">Loading trade ads…</p>}
        {error && <p className="text-center text-sm text-form-error">{error}</p>}
        {deleteError && <p className="mb-2 text-center text-sm text-form-error">{deleteError}</p>}
        {!loading && !error && ads.length === 0 && (
          <p className="text-center text-sm text-quaternary-text">No trade ads found.</p>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-1 xl:grid-cols-1">
          {ads.map((ad) => (
            <TradeAdCard
              key={ad.id}
              ad={ad}
              onOpenDetail={(id) => setView({ type: 'detail', id })}
              onDelete={(id) => void handleDelete(id)}
            />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span className="text-xs text-quaternary-text">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
