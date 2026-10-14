import { useState } from 'react'
import { useTrades } from '@renderer/contexts/TradesContext'
import { TradeSideList } from '@renderer/components/trading/TradeSideList'
import { Button } from '@renderer/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'

const ALL_EXPIRATION_HOURS = [6, 12, 24, 48]

function TimerIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
    </svg>
  )
}

export function CreateTradeAdSidebar(): React.JSX.Element {
  const {
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
  const [expiryOpen, setExpiryOpen] = useState(false)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        <TradeSideList
          title="Offering"
          side="offering"
          items={createOffering}
          onRemove={(key, amount) => removeCreateItem('offering', key, amount)}
          onSetCondition={(key, next) => setCreateItemCondition('offering', key, next)}
          onMove={(key) => moveCreateItem('offering', key)}
        />
        <TradeSideList
          title="Requesting"
          side="requesting"
          items={createRequesting}
          onRemove={(key, amount) => removeCreateItem('requesting', key, amount)}
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

        {createError && <p className="text-xs text-form-error">{createError}</p>}

        <div className="flex gap-2">
          <Popover open={expiryOpen} onOpenChange={setExpiryOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="secondary" aria-label="Expires in" className="shrink-0 gap-1.5 px-3!">
                <TimerIcon />
                {createExpiration}h
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-44 p-1">
              <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-bold tracking-wide text-quaternary-text uppercase">Expires in</p>
              {ALL_EXPIRATION_HOURS.map((hours) => {
                const unlocked = unlockedExpirationHours.has(hours)
                return (
                  <button
                    key={hours}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      setCreateExpiration(hours)
                      setExpiryOpen(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-quaternary-bg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${createExpiration === hours ? 'text-primary-text' : 'text-secondary-text'
                      }`}
                  >
                    {hours} hours
                    {unlocked ? createExpiration === hours && <CheckIcon className="h-4 w-4 text-status-info" /> : <span>🔒</span>}
                  </button>
                )
              })}
            </PopoverContent>
          </Popover>
          <Button type="button" className="flex-1" onClick={() => void submitCreateAd()} disabled={!canSubmitCreate}>
            {createSubmitting ? 'Posting…' : 'Post Trade Ad'}
          </Button>
        </div>
        {!hasRealOfferingItem && (
          <p className="text-[11px] text-quaternary-text">
            Offering needs at least one real item.
          </p>
        )}
      </div>
    </div>
  )
}
