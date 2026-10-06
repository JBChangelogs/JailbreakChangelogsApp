import { useTrades } from '@renderer/contexts/TradesContext'
import { TradeSideList } from '@renderer/components/trading/TradeSideList'
import { Button } from '@renderer/components/ui/button'

const ALL_EXPIRATION_HOURS = [6, 12, 24, 48]

function BackIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19 8 12l7-7" />
    </svg>
  )
}

export function CreateTradeAdSidebar(): React.JSX.Element {
  const {
    setView,
    createOffering,
    createRequesting,
    removeCreateItem,
    setCreateItemCondition,
    moveCreateItem,
    createNote,
    setCreateNote,
    createExpiration,
    setCreateExpiration,
    unlockedExpirationHours,
    createSubmitting,
    createError,
    canSubmitCreate,
    hasRealOfferingItem,
    submitCreateAd
  } = useTrades()

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border-primary px-3 py-2.5">
        <button
          type="button"
          onClick={() => setView({ type: 'list' })}
          aria-label="Back"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
        >
          <BackIcon className="h-4 w-4" />
        </button>
        <h1 className="text-xs font-bold uppercase tracking-wide text-quaternary-text">Create Trade Ad</h1>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <TradeSideList
          title="Offering"
          side="offering"
          items={createOffering}
          onRemove={(key) => removeCreateItem('offering', key)}
          onSetCondition={(key, next) => setCreateItemCondition('offering', key, next)}
          onMove={(key) => moveCreateItem('offering', key)}
        />
        <TradeSideList
          title="Requesting"
          side="requesting"
          items={createRequesting}
          onRemove={(key) => removeCreateItem('requesting', key)}
          onSetCondition={(key, next) => setCreateItemCondition('requesting', key, next)}
          onMove={(key) => moveCreateItem('requesting', key)}
        />

        <div>
          <label className="mb-1 block text-xs font-bold tracking-wide text-quaternary-text uppercase">Trade Note</label>
          <textarea
            value={createNote}
            onChange={(e) => setCreateNote(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Anything else to add? (optional)"
            className="w-full resize-none rounded-xl border border-border-card bg-tertiary-bg p-2 text-sm text-primary-text placeholder-secondary-text focus:border-border-focus focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold tracking-wide text-quaternary-text uppercase">Expires In</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_EXPIRATION_HOURS.map((hours) => {
              const unlocked = unlockedExpirationHours.has(hours)
              return (
                <button
                  key={hours}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => setCreateExpiration(hours)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${createExpiration === hours
                    ? 'border-button-info bg-button-info text-form-button-text'
                    : unlocked
                      ? 'border-border-card bg-tertiary-bg text-secondary-text hover:bg-quaternary-bg'
                      : 'border-border-card bg-tertiary-bg text-quaternary-text opacity-50'
                    }`}
                >
                  {hours}h{!unlocked && ' 🔒'}
                </button>
              )
            })}
          </div>
        </div>

        {createError && <p className="text-xs text-form-error">{createError}</p>}

        <Button type="button" onClick={() => void submitCreateAd()} disabled={!canSubmitCreate}>
          {createSubmitting ? 'Posting…' : 'Post Trade Ad'}
        </Button>
        {!hasRealOfferingItem && (
          <p className="text-[11px] text-quaternary-text">
            Offering needs at least one real item (custom types alone aren't enough).
          </p>
        )}
      </div>
    </div>
  )
}
