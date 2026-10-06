import { useEffect, useState } from 'react'
import { Switch } from '@renderer/components/ui/switch'
import { getDesktopNotificationsEnabled } from '@renderer/lib/localPreferences'
import { updateTrackerAlerts, useTrackerAlerts, type BountyRange } from '@renderer/lib/trackerAlerts'

export function BellIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
      />
    </svg>
  )
}

export function BackgroundAlertsNotice(): React.JSX.Element {
  return (
    <div className="shrink-0 border-t border-border-primary px-3 py-2.5">
      <div className="flex items-start gap-2 rounded-lg bg-tertiary-bg px-2.5 py-2">
        <BellIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-link" />
        <p className="text-[11px] leading-snug text-secondary-text">
          Alerts keep working while you&apos;re on other tabs, so you&apos;ll still be notified when you leave this page.
        </p>
      </div>
    </div>
  )
}

export function DesktopAlertsHint({ show }: { show: boolean }): React.JSX.Element | null {
  if (!show || getDesktopNotificationsEnabled()) return null
  return (
    <p className="mt-2 px-1 text-[11px] text-tertiary-text">
      Desktop notifications are off, so alerts only show inside the app. Turn them on in Settings.
    </p>
  )
}

const toNumber = (value: string): number => Number(value) || 0

function describeRange(range: BountyRange | null): string {
  if (!range) return 'Off'
  if (range.max === 0) return range.min === 0 ? 'Any bounty' : `${range.min.toLocaleString()} or more`
  return `${range.min.toLocaleString()} – ${range.max.toLocaleString()}`
}

const inputClass =
  'h-8 w-full min-w-0 rounded-md border border-border-card bg-primary-bg px-2 text-xs tabular-nums text-primary-text focus:border-button-info focus:outline-none'

function RangeAlertCard({
  title,
  range,
  presets,
  onChange
}: {
  title: string
  range: BountyRange | null
  presets: number[]
  onChange: (range: BountyRange | null) => void
}): React.JSX.Element {
  const [minInput, setMinInput] = useState('')
  const [maxInput, setMaxInput] = useState('')

  useEffect(() => {
    setMinInput(range && range.min > 0 ? String(range.min) : '')
    setMaxInput(range && range.max > 0 ? String(range.max) : '')
  }, [range])

  const commit = (): void => {
    const min = toNumber(minInput)
    const max = toNumber(maxInput)
    onChange({ min, max: max > 0 && max < min ? min : max })
  }

  const enabled = range !== null

  return (
    <div className={`rounded-xl border transition-colors ${enabled ? 'border-button-info/40 bg-button-info/5' : 'border-border-card bg-tertiary-bg'}`}>
      <label className="flex cursor-pointer items-center gap-2.5 p-2.5">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${enabled ? 'bg-button-info/20 text-link' : 'bg-quaternary-bg text-primary-text'}`}
        >
          <BellIcon className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs leading-tight font-semibold text-primary-text">{title}</span>
          <span className={`block truncate text-[11px] ${enabled ? 'text-link' : 'text-tertiary-text'}`}>
            {describeRange(range)}
          </span>
        </span>
        <Switch
          checked={enabled}
          onCheckedChange={(on) => onChange(on ? { min: presets[0], max: 0 } : null)}
        />
      </label>

      {enabled && (
        <div className="border-t border-border-card px-2.5 pt-2 pb-2.5">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {presets.map((min) => {
              const active = range.min === min && range.max === 0
              return (
                <button
                  key={min}
                  type="button"
                  onClick={() => onChange({ min, max: 0 })}
                  aria-pressed={active}
                  className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-semibold transition-colors ${active
                    ? 'border-button-info bg-button-info/20 text-primary-text'
                    : 'border-border-card bg-secondary-bg text-secondary-text hover:bg-quaternary-bg hover:text-primary-text'
                    }`}
                >
                  {min >= 1000 ? `${min / 1000}k+` : `${min}+`}
                </button>
              )
            })}
          </div>
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-[10px] font-medium text-tertiary-text">Min</span>
              <input
                type="text"
                inputMode="numeric"
                value={minInput}
                onChange={(e) => setMinInput(e.target.value.replace(/\D/g, ''))}
                onBlur={commit}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                placeholder="0"
                className={inputClass}
              />
            </label>
            <span className="pb-2 text-xs text-tertiary-text">–</span>
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-[10px] font-medium text-tertiary-text">Max</span>
              <input
                type="text"
                inputMode="numeric"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value.replace(/\D/g, ''))}
                onBlur={commit}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                placeholder="No max"
                className={inputClass}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

export function BountyAlertsSection(): React.JSX.Element {
  const { serverBounty, playerBounty } = useTrackerAlerts()
  const activeCount = Number(serverBounty !== null) + Number(playerBounty !== null)

  return (
    <div className="mt-4 border-t border-border-primary pt-3">
      <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
        <span className="text-[10px] font-bold tracking-wide text-quaternary-text uppercase">Alerts</span>
        <span className="text-[10px] text-tertiary-text">{activeCount > 0 ? `${activeCount} on` : 'Off'}</span>
      </div>
      <div className="space-y-2 px-1">
        <RangeAlertCard
          title="Server bounty"
          range={serverBounty}
          presets={[25_000, 50_000, 100_000]}
          onChange={(range) => updateTrackerAlerts({ serverBounty: range })}
        />
        <RangeAlertCard
          title="Player bounty"
          range={playerBounty}
          presets={[10_000, 25_000, 50_000]}
          onChange={(range) => updateTrackerAlerts({ playerBounty: range })}
        />
      </div>
      <DesktopAlertsHint show={activeCount > 0} />
    </div>
  )
}
