import { useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useTrades } from '@renderer/contexts/TradesContext'
import { tradesApi } from '@renderer/lib/tradesApi'
import { TradeAdCard } from '@renderer/components/trading/TradeAdCard'
import { CreateTradeAdScreen } from '@renderer/components/trading/CreateTradeAdScreen'
import { TradeAdDetailScreen } from '@renderer/components/trading/TradeAdDetailScreen'
import { Button } from '@renderer/components/ui/button'

function EmptyState({
  title,
  description,
  action
}: {
  title: string
  description: string
  action?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="mx-auto mt-6 flex max-w-md flex-col items-center rounded-xl border border-dashed border-border-card px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-tertiary-bg text-secondary-text">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      </div>
      <p className="mt-3 text-sm font-semibold text-primary-text">{title}</p>
      <p className="mt-1 text-xs text-secondary-text">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function TradesScreen({ onMessageUser }: { onMessageUser: (userId: string) => void }): React.JSX.Element {
  const { token } = useAuth()
  const { ads, loading, error, page, totalPages, setPage, bumpRefreshToken, refresh, view, setView, tab, searchQuery, setSearchQuery } =
    useTrades()
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
    return (
      <TradeAdDetailScreen
        key={view.id}
        tradeId={view.id}
        onBack={() => setView({ type: 'list' })}
        onMessageUser={onMessageUser}
        openMakeOffer={view.makeOffer}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border-primary px-5 py-4">
        <h2 className="text-sm font-semibold text-primary-text">Trade Ads</h2>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading && ads.length === 0 && (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
          </div>
        )}
        {error && (
          <EmptyState
            title="Couldn't load trade ads"
            description={error}
            action={
              <Button type="button" size="sm" onClick={refresh}>
                Retry
              </Button>
            }
          />
        )}
        {deleteError && <p className="mb-2 text-center text-sm text-form-error">{deleteError}</p>}
        {!loading && !error && ads.length === 0 &&
          (searchQuery.trim() ? (
            <EmptyState
              title="No matching trade ads"
              description={`Nothing on this page matches "${searchQuery.trim()}".`}
              action={
                <Button type="button" size="sm" variant="secondary" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              title={tab === 'mine' ? "You haven't posted any trade ads" : 'No trade ads yet'}
              description={
                tab === 'mine'
                  ? 'Post an ad to let other traders know what you have and what you want.'
                  : 'Be the first to post one.'
              }
              action={
                <Button type="button" size="sm" onClick={() => setView({ type: 'create' })}>
                  Create Trade Ad
                </Button>
              }
            />
          ))}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-1 xl:grid-cols-1">
          {ads.map((ad) => (
            <TradeAdCard
              key={ad.id}
              ad={ad}
              onOpenDetail={(id, makeOffer) => setView({ type: 'detail', id, makeOffer })}
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
