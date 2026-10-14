import { useTrades } from '@renderer/contexts/TradesContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'

function Choice({
  title,
  description,
  disabled,
  onClick
}: {
  title: string
  description: string
  disabled?: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-xl border border-border-card bg-tertiary-bg p-3 text-left transition-colors hover:bg-quaternary-bg disabled:opacity-50"
    >
      <p className="text-sm font-semibold text-primary-text">{title}</p>
      <p className="mt-0.5 text-xs text-secondary-text">{description}</p>
    </button>
  )
}

// Asked when Make Offer is clicked: send the ad's own terms straight away, or build a custom offer.
export function OfferChoiceDialog(): React.JSX.Element {
  const { offer } = useTrades()
  const { prompt, closePrompt, customize, submit, submitting, error } = offer

  return (
    <Dialog open={prompt !== null} onOpenChange={(open) => !open && closePrompt()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Make an Offer</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 px-5 py-4">
          <Choice
            title={submitting ? 'Sending…' : 'Quick Offer'}
            description="Send exactly what the ad asks for, no changes."
            disabled={submitting}
            onClick={() => void submit(true)}
          />
          <Choice
            title="Custom Offer"
            description="Pick your own items for each side and add a note."
            disabled={submitting}
            onClick={customize}
          />
          {error && <p className="text-xs text-form-error">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
