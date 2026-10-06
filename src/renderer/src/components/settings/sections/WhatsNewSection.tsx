import { useEffect, useState } from 'react'
import { APP_CHANGELOG } from '@shared/appChangelog'
import { Button } from '@renderer/components/ui/button'

const GROUP_LABELS = {
  added: 'Added',
  changed: 'Changed',
  fixed: 'Fixed',
  removed: 'Removed'
} as const

const GROUP_COLORS: Record<keyof typeof GROUP_LABELS, string> = {
  added: 'text-status-success-vibrant',
  changed: 'text-status-info',
  fixed: 'text-status-warning',
  removed: 'text-status-error'
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

function CheckForUpdatesRow(): React.JSX.Element {
  const [checking, setChecking] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(
    () =>
      window.api.updater.onStatus((status) => {
        if (status.state === 'checking') {
          setChecking(true)
          setFeedback(null)
        } else if (status.state === 'not-available') {
          setChecking(false)
          setFeedback("You're up to date.")
        } else if (status.state === 'available' || status.state === 'downloading') {
          setChecking(false)
          setFeedback('Update found - downloading…')
        } else if (status.state === 'downloaded') {
          setChecking(false)
          setFeedback('Update ready - restart to apply it.')
        } else if (status.state === 'error') {
          setChecking(false)
          setFeedback('Could not check for updates.')
        }
      }),
    []
  )

  const currentVersion = APP_CHANGELOG[0]?.version

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border-card bg-secondary-bg px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-primary-text">
          {currentVersion ? `Version ${currentVersion}` : 'Jailbreak Changelogs'}
        </p>
        {feedback && <p className="mt-0.5 text-xs text-tertiary-text">{feedback}</p>}
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={checking}
        onClick={() => window.api.updater.checkNow()}
      >
        {checking ? 'Checking…' : 'Check for Updates'}
      </Button>
    </div>
  )
}

export function WhatsNewSection(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <h1 className="text-xl font-bold text-primary-text">What's New</h1>
      <p className="mt-1 text-sm text-tertiary-text">What's changed in each version of this app.</p>

      <div className="mt-6">
        <CheckForUpdatesRow />
      </div>

      <div className="mt-6 space-y-8">
        {APP_CHANGELOG.map((entry) => (
          <div key={entry.version} className="rounded-2xl border border-border-card bg-secondary-bg p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-bold text-primary-text">Version {entry.version}</h2>
              <span className="shrink-0 text-xs text-quaternary-text">{formatDate(entry.date)}</span>
            </div>

            <div className="mt-3 space-y-3">
              {(Object.keys(GROUP_LABELS) as (keyof typeof GROUP_LABELS)[]).map((group) => {
                const items = entry[group]
                if (!items || items.length === 0) return null
                return (
                  <div key={group}>
                    <h3 className={`text-xs font-bold tracking-wide uppercase ${GROUP_COLORS[group]}`}>
                      {GROUP_LABELS[group]}
                    </h3>
                    <ul className="mt-1.5 space-y-1.5">
                      {items.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-secondary-text">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-tertiary-text" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
