import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { giftsApi } from '@renderer/lib/giftsApi'
import { Button } from '@renderer/components/ui/button'
import { GiftToUserModal } from './GiftToUserModal'
import { SupporterHistoryCard, SupporterTierRow } from './SupporterSections'
import { SETTINGS_LIST, SettingRow, SettingsCard, SettingsPageLayout } from '@renderer/components/settings/SettingsCard'
import { GiftIcon } from '@renderer/components/settings/SettingsSidebar'
import type { SupporterGift } from '@shared/gifts'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({})
  const [giftModalFor, setGiftModalFor] = useState<SupporterGift | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError(null)
    giftsApi
      .list(token)
      .then(setGifts)
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

  return (
    <SettingsPageLayout>
      <SupporterHistoryCard />
      <SettingsCard
        title="Purchased Gifts"
        icon={GiftIcon}
        description={<p>Supporter gifts purchased on your account.</p>}
      >
        <div className={SETTINGS_LIST}>
          <SettingRow
            title="Buy a gift"
            description="Give Supporter to a friend, or keep it to redeem yourself later."
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => void window.api.openExternal('https://jailbreakchangelogs.com/supporting')}
              >
                View benefits
              </Button>
            }
          >
          </SettingRow>

          {loading && <p className="text-sm text-quaternary-text">Loading…</p>}
          {error && <p className="text-sm text-form-error">{error}</p>}
          {!loading && !error && gifts && gifts.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-card px-4 py-8 text-center">
              <GiftIcon className="size-8 text-secondary-text" />
              <p className="text-sm font-medium text-primary-text">No gifts yet</p>
              <p className="max-w-sm text-sm text-secondary-text">
                Gifts you buy show up here, ready to redeem yourself or send to someone.
              </p>
            </div>
          )}
          {!loading && !error && gifts && gifts.length > 0 && (
            <div className="space-y-3">
              {gifts.map((gift) => {
                const busy = !!pendingIds[gift.share_id]
                return (
                  <SupporterTierRow
                    key={gift.id}
                    level={gift.level}
                    name={tierLabel(gift.level)}
                    detail={`Bought ${new Date(gift.created_at * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`}
                    actions={
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void handleRedeemForSelf(gift)}
                        >
                          {busy ? 'Processing…' : 'Redeem'}
                        </Button>
                        <Button type="button" disabled={busy} onClick={() => setGiftModalFor(gift)}>
                          {busy ? 'Processing…' : 'Gift to User'}
                        </Button>
                      </>
                    }
                  />
                )
              })}
            </div>
          )}
        </div>
      </SettingsCard>

      {giftModalFor && (
        <GiftToUserModal
          levelLabel={tierLabel(giftModalFor.level)}
          onCancel={() => setGiftModalFor(null)}
          onConfirm={(recipient) => handleGiftToUser(giftModalFor, recipient)}
        />
      )}
    </SettingsPageLayout>
  )
}
