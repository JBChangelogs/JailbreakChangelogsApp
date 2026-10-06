import { useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useTradeComposer, type TradeSide } from '@renderer/hooks/useTradeComposer'
import { tradesApi } from '@renderer/lib/tradesApi'
import { toCreatePayload, totalCount } from '@renderer/lib/tradeItemDraft'
import { TradeItemPicker } from '@renderer/components/trading/TradeItemPicker'
import { TradeSideList } from '@renderer/components/trading/TradeSideList'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'

type Mode = 'quick' | 'custom'

interface MakeOfferDialogProps {
  tradeId: number
  onCancel: () => void
  onSent: () => void
}

export function MakeOfferDialog({ tradeId, onCancel, onSent }: MakeOfferDialogProps): React.JSX.Element {
  const { token } = useAuth()
  const [mode, setMode] = useState<Mode>('quick')
  const [activeSide, setActiveSide] = useState<TradeSide>('offering')
  const [note, setNote] = useState('')
  const composer = useTradeComposer()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleQuickOffer = async (): Promise<void> => {
    if (!token) return
    setSubmitting(true)
    setError(null)
    try {
      await tradesApi.createOffer(token, tradeId)
      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send offer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCustomOffer = async (): Promise<void> => {
    if (!token) return
    setSubmitting(true)
    setError(null)
    try {
      await tradesApi.createOffer(token, tradeId, {
        note: note.trim() || undefined,
        offering: toCreatePayload(composer.offering),
        requesting: toCreatePayload(composer.requesting)
      })
      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send offer')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className={mode === 'custom' ? 'max-w-3xl' : 'max-w-sm'}>
        <DialogHeader>
          <DialogTitle>Make an Offer</DialogTitle>
        </DialogHeader>

        <div className="flex shrink-0 items-center gap-1.5 border-b border-border-primary px-5 pb-3">
          <button
            type="button"
            onClick={() => setMode('quick')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'quick' ? 'bg-button-info text-form-button-text' : 'text-secondary-text hover:text-primary-text'
              }`}
          >
            Quick Offer
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${mode === 'custom' ? 'bg-button-info text-form-button-text' : 'text-secondary-text hover:text-primary-text'
              }`}
          >
            Custom Offer
          </button>
        </div>

        {mode === 'quick' ? (
          <div className="px-5 py-4">
            <p className="text-sm text-secondary-text">
              This sends an offer accepting exactly what's requested in the trade ad, with no changes.
            </p>
            {error && <p className="mt-2 text-xs text-form-error">{error}</p>}
          </div>
        ) : (
          <div className="flex h-96 min-h-0">
            <div className="flex min-h-0 w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r border-border-primary p-3">
              <TradeSideList
                title="Your Offering"
                side="offering"
                items={composer.offering}
                onRemove={(key, amount) => composer.removeAmount('offering', key, amount)}
                onSetCondition={(key, next) => composer.setCondition('offering', key, next)}
                onMove={(key) => composer.moveToOtherSide('offering', key)}
              />
              <TradeSideList
                title="Your Requesting"
                side="requesting"
                items={composer.requesting}
                onRemove={(key, amount) => composer.removeAmount('requesting', key, amount)}
                onSetCondition={(key, next) => composer.setCondition('requesting', key, next)}
                onMove={(key) => composer.moveToOtherSide('requesting', key)}
              />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="Note (optional)"
                className="w-full resize-none rounded-xl border border-border-card bg-tertiary-bg p-2 text-xs text-primary-text placeholder-secondary-text focus:border-border-focus focus:outline-none"
              />
              {error && <p className="text-xs text-form-error">{error}</p>}
            </div>
            <div className="min-h-0 flex-1">
              <TradeItemPicker
                side={activeSide}
                onSide={setActiveSide}
                onAddItem={(item, duped, og, side) => composer.addItem(side, item, duped, og)}
                onAddCustomType={(customId, side) => composer.addCustomType(side, customId)}
                atCap={totalCount(activeSide === 'offering' ? composer.offering : composer.requesting) >= 8}
              />
            </div>
          </div>
        )}

        <div className="flex shrink-0 justify-end gap-2 border-t border-border-primary px-5 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void (mode === 'quick' ? handleQuickOffer() : handleCustomOffer())}
            disabled={submitting}
          >
            {submitting ? 'Sending…' : 'Send Offer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
