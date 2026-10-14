import { useTrades } from '@renderer/contexts/TradesContext'
import { TradeSideList } from '@renderer/components/trading/TradeSideList'
import { Button } from '@renderer/components/ui/button'

export function MakeOfferSidebar(): React.JSX.Element {
  const { offer } = useTrades()
  const { composer, note, setNote, submitting, error, canSubmitCustom, submit } = offer

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <TradeSideList
          title="You Offer"
          side="offering"
          items={composer.offering}
          onRemove={(key, amount) => composer.removeAmount('offering', key, amount)}
          onSetCondition={(key, next) => composer.setCondition('offering', key, next)}
          onMove={(key) => composer.moveToOtherSide('offering', key)}
        />
        <TradeSideList
          title="You Request"
          side="requesting"
          items={composer.requesting}
          onRemove={(key, amount) => composer.removeAmount('requesting', key, amount)}
          onSetCondition={(key, next) => composer.setCondition('requesting', key, next)}
          onMove={(key) => composer.moveToOtherSide('requesting', key)}
        />

        <div>
          <label className="mb-1 block text-xs font-bold tracking-wide text-quaternary-text uppercase">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Anything else to add? (optional)"
            className="w-full resize-none rounded-xl border border-border-card bg-tertiary-bg p-2 text-sm text-primary-text placeholder-secondary-text focus:border-border-focus focus:outline-none"
          />
        </div>

        {error && <p className="text-xs text-form-error">{error}</p>}

        <Button type="button" onClick={() => void submit(false)} disabled={!canSubmitCustom}>
          {submitting ? 'Sending…' : 'Send Offer'}
        </Button>
      </div>
    </div>
  )
}
