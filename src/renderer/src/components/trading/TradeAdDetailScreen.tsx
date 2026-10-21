import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { useTrades } from '@renderer/contexts/TradesContext'
import { tradesApi } from '@renderer/lib/tradesApi'
import { useRelativeTime } from '@renderer/hooks/useRelativeTime'
import { showToast } from '@renderer/lib/toast'
import { formatFullValue } from '@renderer/lib/itemValueUtils'
import { sideTotalValue, isTradeExpired, formatTimeLeft } from '@renderer/lib/tradeDisplay'
import type { TradeAd, TradeItemWire, TradeOffer } from '@shared/trading'
import { ItemTile, TradeSidePreview, TradeUserAvatar, tradeUserLabel } from '@renderer/components/trading/TradeAdCard'
import { Button } from '@renderer/components/ui/button'
import { TradesHeader } from '@renderer/components/trading/TradesHeader'

const OFFER_STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Accepted',
  2: 'Declined',
  3: 'Completed'
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong'
}

function InboxIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z"
      />
    </svg>
  )
}


export function ItemSide({ items, label }: { items: TradeItemWire[]; label: string }): React.JSX.Element {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 flex items-center justify-between text-[10px] font-bold tracking-wide text-quaternary-text uppercase">
        <span>{label}</span>
        {sideTotalValue(items) > 0 && (
          <span className="text-primary-text">{formatFullValue(String(sideTotalValue(items)))}</span>
        )}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-quaternary-text">Nothing</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <ItemTile key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function OfferRow({
  offer,
  ad,
  isAdOwner,
  currentUserId,
  busy,
  onRespond,
  onDelete,
  onMessageUser
}: {
  offer: TradeOffer
  ad: TradeAd
  isAdOwner: boolean
  currentUserId: string | null
  busy: boolean
  onRespond: (offerId: number, status: 'accept' | 'decline') => void
  onDelete: (offerId: number) => void
  onMessageUser?: (userId: string) => void
}): React.JSX.Element {
  const label = tradeUserLabel(offer.user)
  const created = useRelativeTime(offer.created_at)
  const isOfferAuthor = currentUserId === offer.user?.id
  const status = offer.status ?? 0
  const offerUserId = offer.user?.id

  return (
    <div className="rounded-2xl border border-border-card bg-secondary-bg p-3">
      <div className="mb-2 flex items-center gap-2">
        <TradeUserAvatar user={offer.user} label={label} className="h-6 w-6" />
        <span className="min-w-0 truncate text-sm font-medium text-primary-text">{label}</span>
        {created && <span className="shrink-0 text-[11px] text-quaternary-text">{created}</span>}
        <span className="flex-1" />
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

      <div className="grid grid-cols-2 gap-3">
        <ItemSide items={offer.offering ?? ad.requesting} label="Offering" />
        <ItemSide items={offer.requesting ?? ad.offering} label="Requesting" />
      </div>

      <div className="mt-2 flex justify-end gap-2">
        {isAdOwner && offerUserId && onMessageUser && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onMessageUser(offerUserId)}>
            Message
          </Button>
        )}
        {isAdOwner && status === 0 && (
          <>
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => onRespond(offer.id, 'decline')}>
              Decline
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => onRespond(offer.id, 'accept')}>
              Accept
            </Button>
          </>
        )}
        {isOfferAuthor && status === 0 && (
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => onDelete(offer.id)}>
            Delete Offer
          </Button>
        )}
      </div>
    </div>
  )
}

export function TradeAdDetailScreen({
  tradeId,
  onBack,
  onMessageUser
}: {
  tradeId: number
  onBack: () => void
  onMessageUser?: (userId: string) => void
}): React.JSX.Element {
  const { token } = useAuth()
  const { user: currentUser } = useCurrentUser()
  const { bumpRefreshToken, refresh, offer } = useTrades()
  const [ad, setAd] = useState<TradeAd | null>(null)
  const [offers, setOffers] = useState<TradeOffer[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
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

  const runAction = async (failureTitle: string, action: () => Promise<void>): Promise<void> => {
    if (busy) return
    setBusy(true)
    try {
      await action()
    } catch (err) {
      showToast(failureTitle, { description: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  const handleRespond = (offerId: number, status: 'accept' | 'decline'): void => {
    if (!token) return
    void runAction(`Couldn't ${status} the offer`, async () => {
      await tradesApi.respondToOffer(token, tradeId, offerId, status)
      load()
    })
  }

  const handleDeleteOffer = (offerId: number): void => {
    if (!token) return
    void runAction("Couldn't delete the offer", async () => {
      await tradesApi.deleteOffer(token, tradeId, offerId)
      load()
    })
  }

  const handleDeleteAd = (): void => {
    if (!token || !ad) return
    if (!window.confirm('Delete this trade ad? This cannot be undone.')) return
    void runAction("Couldn't delete the trade ad", async () => {
      await tradesApi.delete(token, ad.id)
      bumpRefreshToken()
      refresh()
      onBack()
    })
  }

  const isOwner = currentUser?.id === ad?.author
  const expired = ad ? isTradeExpired(ad) : false
  const posterLabel = ad ? tradeUserLabel(ad.user, ad.author) : ''

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <TradesHeader title={`Trade Ad #${tradeId}`} onBack={onBack} />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {error && <p className="text-sm text-form-error">{error}</p>}
        {!error && !ad && <p className="text-sm text-quaternary-text">Loading…</p>}

        {ad && (
          <>
            <div className="mb-4 rounded-2xl border border-border-card bg-secondary-bg p-3">
              <div className="flex items-center gap-3">
                <TradeUserAvatar user={ad.user} label={posterLabel} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-primary-text">{posterLabel}</p>
                  <p className="text-xs text-secondary-text">
                    Posted {relativeCreated ?? 'just now'}
                    {' · '}
                    {expired ? (
                      <span className="text-status-error">Expired</span>
                    ) : (
                      <span>Expires in {formatTimeLeft(ad.expires)}</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {isOwner ? (
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={handleDeleteAd}>
                      Delete Ad
                    </Button>
                  ) : (
                    <>
                      {onMessageUser && (
                        <Button type="button" size="sm" variant="secondary" onClick={() => onMessageUser(ad.author)}>
                          Message
                        </Button>
                      )}
                      {!expired && (
                        <Button type="button" size="sm" onClick={() => offer.start(tradeId, 'detail')}>
                          Make Offer
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {ad.note && <p className="mt-3 text-sm text-primary-text">{ad.note}</p>}
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TradeSidePreview items={ad.offering} title="Offering" />
              <TradeSidePreview items={ad.requesting} title="Requesting" />
            </div>

            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-primary-text">Offers</h2>
              {offers && offers.length > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-quaternary-bg px-1.5 text-[11px] font-semibold text-secondary-text">
                  {offers.length}
                </span>
              )}
            </div>
            {offers === null && (
              <div className="flex justify-center rounded-xl border border-dashed border-border-card py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
              </div>
            )}
            {offers?.length === 0 && (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-border-card px-6 py-10 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-tertiary-bg text-secondary-text">
                  <InboxIcon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-primary-text">No offers yet</p>
                <p className="mt-1 max-w-xs text-xs text-secondary-text">
                  {isOwner
                    ? "When someone makes an offer on your ad, it'll show up here."
                    : expired
                      ? 'This ad has expired, so it can no longer receive offers.'
                      : 'Be the first to make an offer on this trade.'}
                </p>
                {!isOwner && !expired && (
                  <Button type="button" size="sm" className="mt-4" onClick={() => offer.start(tradeId, 'detail')}>
                    Make Offer
                  </Button>
                )}
              </div>
            )}
            <div className="space-y-2">
              {offers?.map((offer) => (
                <OfferRow
                  key={offer.id}
                  offer={offer}
                  ad={ad}
                  isAdOwner={isOwner}
                  currentUserId={currentUser?.id ?? null}
                  busy={busy}
                  onRespond={handleRespond}
                  onDelete={handleDeleteOffer}
                  onMessageUser={onMessageUser}
                />
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  )
}
