import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { useTrades } from '@renderer/contexts/TradesContext'
import { tradesApi } from '@renderer/lib/tradesApi'
import { useRelativeTime } from '@renderer/hooks/useRelativeTime'
import { formatFullValue, getItemImagePath, handleImageError } from '@renderer/lib/itemValueUtils'
import { sideTotalValue, isTradeExpired } from '@renderer/lib/tradeDisplay'
import { isCustomTradeItemId, type TradeAd, type TradeItemWire, type TradeOffer } from '@shared/trading'
import { MakeOfferDialog } from '@renderer/components/trading/MakeOfferDialog'
import { Button } from '@renderer/components/ui/button'

function BackIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19 8 12l7-7" />
    </svg>
  )
}

const OFFER_STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Accepted',
  2: 'Declined',
  3: 'Completed'
}

function ItemList({ items, valueLabel }: { items: TradeItemWire[]; valueLabel: string }): React.JSX.Element {
  return (
    <div>
      <p className="mb-1.5 flex items-center justify-between text-[10px] font-bold tracking-wide text-quaternary-text uppercase">
        <span>{valueLabel}</span>
        <span>{formatFullValue(String(sideTotalValue(items)))}</span>
      </p>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={`${item.id}-${i}`} className="flex items-center gap-2 rounded-md bg-tertiary-bg p-1.5">
            {!isCustomTradeItemId(item.id) && item.name && item.type && (
              <img
                src={getItemImagePath(item.type, item.name)}
                alt=""
                onError={handleImageError}
                className="h-7 w-7 shrink-0 rounded object-cover"
                draggable={false}
              />
            )}
            <span className="min-w-0 flex-1 truncate text-xs text-primary-text">
              {item.name ?? item.id}
              {(item.amount ?? 1) > 1 && ` ×${item.amount}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OfferRow({
  offer,
  ad,
  isAdOwner,
  currentUserId,
  onRespond,
  onDelete
}: {
  offer: TradeOffer
  ad: TradeAd
  isAdOwner: boolean
  currentUserId: string | null
  onRespond: (offerId: number, status: 'accept' | 'decline') => void
  onDelete: (offerId: number) => void
}): React.JSX.Element {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const avatar = offer.user?.roblox_avatar ?? null
  const label = offer.user?.global_name || offer.user?.username || 'Someone'
  const isOfferAuthor = currentUserId === offer.user?.id
  const status = offer.status ?? 0

  return (
    <div className="rounded-2xl border border-border-card bg-secondary-bg p-3">
      <div className="mb-2 flex items-center gap-2">
        {avatar && !avatarFailed ? (
          <img
            src={avatar}
            alt=""
            onError={() => setAvatarFailed(true)}
            className="h-6 w-6 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="h-6 w-6 shrink-0 rounded-full bg-tertiary-bg" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary-text">{label}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status === 1
            ? 'bg-status-success-vibrant/15 text-status-success-vibrant'
            : status === 2
              ? 'bg-status-error/15 text-status-error'
              : 'bg-quaternary-bg text-secondary-text'
            }`}
        >
          {OFFER_STATUS_LABELS[status] ?? 'Pending'}
        </span>
      </div>

      {offer.note && <p className="mb-2 text-xs text-secondary-text">{offer.note}</p>}

      <div className="grid grid-cols-2 gap-2">
        <ItemList items={offer.offering ?? ad.requesting} valueLabel="Offering" />
        <ItemList items={offer.requesting ?? ad.offering} valueLabel="Requesting" />
      </div>

      <div className="mt-2 flex justify-end gap-2">
        {isAdOwner && status === 0 && (
          <>
            <Button type="button" size="sm" variant="secondary" onClick={() => onRespond(offer.id, 'decline')}>
              Decline
            </Button>
            <Button type="button" size="sm" onClick={() => onRespond(offer.id, 'accept')}>
              Accept
            </Button>
          </>
        )}
        {isOfferAuthor && status === 0 && (
          <Button type="button" size="sm" variant="secondary" onClick={() => onDelete(offer.id)}>
            Delete Offer
          </Button>
        )}
      </div>
    </div>
  )
}

export function TradeAdDetailScreen({ tradeId, onBack }: { tradeId: number; onBack: () => void }): React.JSX.Element {
  const { token } = useAuth()
  const { user: currentUser } = useCurrentUser()
  const { bumpRefreshToken, refresh } = useTrades()
  const [ad, setAd] = useState<TradeAd | null>(null)
  const [offers, setOffers] = useState<TradeOffer[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showMakeOffer, setShowMakeOffer] = useState(false)
  const relativeCreated = useRelativeTime(ad?.created_at)

  const load = (): void => {
    if (!token) return
    setError(null)
    tradesApi
      .get(token, tradeId)
      .then(setAd)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load trade ad'))
    tradesApi
      .listOffers(token, tradeId)
      .then(setOffers)
      .catch(() => setOffers([]))
  }

  useEffect(load, [token, tradeId])

  const handleRespond = async (offerId: number, status: 'accept' | 'decline'): Promise<void> => {
    if (!token) return
    await tradesApi.respondToOffer(token, tradeId, offerId, status)
    load()
  }

  const handleDeleteOffer = async (offerId: number): Promise<void> => {
    if (!token) return
    await tradesApi.deleteOffer(token, tradeId, offerId)
    load()
  }

  const handleDeleteAd = async (): Promise<void> => {
    if (!token || !ad) return
    if (!window.confirm('Delete this trade ad? This cannot be undone.')) return
    await tradesApi.delete(token, ad.id)
    bumpRefreshToken()
    refresh()
    onBack()
  }

  const isOwner = currentUser?.id === ad?.author

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border-primary px-4 py-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-7 w-7 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
        >
          <BackIcon className="h-4 w-4" />
        </button>
        <h1 className="text-sm font-semibold text-primary-text">Trade Ad #{tradeId}</h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {error && <p className="text-sm text-form-error">{error}</p>}
        {!error && !ad && <p className="text-sm text-quaternary-text">Loading…</p>}

        {ad && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-text">
                  Posted {relativeCreated ?? 'just now'}
                  {isTradeExpired(ad) && <span className="ml-2 text-status-error">Expired</span>}
                </p>
                {ad.note && <p className="mt-1 text-sm text-primary-text">{ad.note}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                {isOwner ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => void handleDeleteAd()}>
                    Delete Ad
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={() => setShowMakeOffer(true)}>
                    Make Offer
                  </Button>
                )}
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3">
              <ItemList items={ad.offering} valueLabel="Offering" />
              <ItemList items={ad.requesting} valueLabel="Requesting" />
            </div>

            <h2 className="mb-2 text-xs font-bold tracking-wide text-quaternary-text uppercase">
              Offers {offers ? `(${offers.length})` : ''}
            </h2>
            {offers === null && <p className="text-sm text-quaternary-text">Loading offers…</p>}
            {offers?.length === 0 && <p className="text-sm text-quaternary-text">No offers yet.</p>}
            <div className="space-y-2">
              {offers?.map((offer) => (
                <OfferRow
                  key={offer.id}
                  offer={offer}
                  ad={ad}
                  isAdOwner={isOwner}
                  currentUserId={currentUser?.id ?? null}
                  onRespond={(offerId, status) => void handleRespond(offerId, status)}
                  onDelete={(offerId) => void handleDeleteOffer(offerId)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showMakeOffer && (
        <MakeOfferDialog
          tradeId={tradeId}
          onCancel={() => setShowMakeOffer(false)}
          onSent={() => {
            setShowMakeOffer(false)
            load()
          }}
        />
      )}
    </div>
  )
}
