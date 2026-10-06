import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { giftsApi } from '@renderer/lib/giftsApi'
import { supporterBadgeUrl } from '@renderer/lib/badgeAssets'
import { Button } from '@renderer/components/ui/button'
import { GiftToUserModal } from './GiftToUserModal'
import type { SupporterGift, SupporterLevel } from '@shared/gifts'
import type { UserProfile } from '@shared/user'

const TIER_LABELS: Record<number, string> = {
  1: 'Supporter One Gift',
  2: 'Supporter Two Gift',
  3: 'Supporter Three Gift'
}

function tierLabel(level: number): string {
  return TIER_LABELS[level] ?? `Supporter Gift ${level}`
}

export function GiftInventorySection(): React.JSX.Element {
  const { token } = useAuth()
  const { user } = useCurrentUser()
  const [gifts, setGifts] = useState<SupporterGift[] | null>(null)
  const [levels, setLevels] = useState<SupporterLevel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({})
  const [giftModalFor, setGiftModalFor] = useState<SupporterGift | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    Promise.all([giftsApi.list(token), giftsApi.levels()])
      .then(([giftsList, levelsList]) => {
        setGifts(giftsList)
        setLevels(levelsList)
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load gifts'))
      .finally(() => setLoading(false))
  }, [token])

  const handleRedeemForSelf = async (gift: SupporterGift): Promise<void> => {
    if (!token || !user) return
    setPendingIds((prev) => ({ ...prev, [gift.share_id]: true }))
    try {
      await giftsApi.redeem(token, gift.share_id, user.id)
      setGifts((prev) => (prev ? prev.filter((g) => g.share_id !== gift.share_id) : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to redeem gift')
    } finally {
      setPendingIds((prev) => {
        const next = { ...prev }
        delete next[gift.share_id]
        return next
      })
    }
  }

  const handleGiftToUser = async (gift: SupporterGift, recipient: UserProfile): Promise<void> => {
    if (!token) return
    setPendingIds((prev) => ({ ...prev, [gift.share_id]: true }))
    try {
      await giftsApi.redeem(token, gift.share_id, recipient.id)
      setGifts((prev) => (prev ? prev.filter((g) => g.share_id !== gift.share_id) : prev))
      setGiftModalFor(null)
    } finally {
      setPendingIds((prev) => {
        const next = { ...prev }
        delete next[gift.share_id]
        return next
      })
    }
  }

  const giftableLevels = [...levels].filter((l) => l.is_gift).sort((a, b) => a.level - b.level)

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <h1 className="text-xl font-bold text-primary-text">Supporter Gifts</h1>
      <p className="mt-1 text-sm text-tertiary-text">Supporter gifts purchased on your account.</p>
      <p className="mt-1 text-sm text-tertiary-text">
        Want to compare perks first?{' '}
        <button
          type="button"
          onClick={() => void window.api.openExternal('https://jailbreakchangelogs.com/supporting')}
          className="text-link hover:text-link-hover"
        >
          View supporter tier benefits
        </button>
        .
      </p>

      {loading && <p className="mt-6 text-sm text-quaternary-text">Loading…</p>}
      {error && <p className="mt-6 text-sm text-form-error">{error}</p>}

      {!loading && !error && gifts && (
        <div className="mt-6 space-y-3">
          {gifts.length === 0 && <p className="text-sm text-quaternary-text">No gifts purchased yet.</p>}
          {gifts.map((gift) => (
            <div key={gift.id} className="flex flex-col gap-3 rounded-2xl border border-border-card bg-tertiary-bg p-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-primary-text">{tierLabel(gift.level)}</p>
                <img src={supporterBadgeUrl(gift.level)} alt="" className="h-4.5 w-4.5 object-contain" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!!pendingIds[gift.share_id]}
                  onClick={() => void handleRedeemForSelf(gift)}
                >
                  {pendingIds[gift.share_id] ? 'Processing…' : 'Self Redeem'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!!pendingIds[gift.share_id]}
                  onClick={() => setGiftModalFor(gift)}
                >
                  {pendingIds[gift.share_id] ? 'Processing…' : 'Gift to User'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-6 text-xs font-bold tracking-wide text-quaternary-text uppercase">Buy a gift</h2>
      <div className="mt-3 space-y-2">
        {giftableLevels.map((level) => (
          <div
            key={level.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border-card bg-tertiary-bg px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <img src={supporterBadgeUrl(level.level)} alt="" className="h-4.5 w-4.5 shrink-0 object-contain" />
              <div className="min-w-0">
                <p className="text-sm text-primary-text">{level.name}</p>
                <p className="mt-0.5 text-xs text-tertiary-text">{level.price_str}</p>
              </div>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => void window.api.openExternal(level.url)}>
              Purchase
            </Button>
          </div>
        ))}
        {giftableLevels.length === 0 && !loading && (
          <p className="text-sm text-quaternary-text">No gift tiers available right now.</p>
        )}
      </div>

      {giftModalFor && (
        <GiftToUserModal
          levelLabel={tierLabel(giftModalFor.level)}
          onCancel={() => setGiftModalFor(null)}
          onConfirm={(recipient) => handleGiftToUser(giftModalFor, recipient)}
        />
      )}
    </div>
  )
}
