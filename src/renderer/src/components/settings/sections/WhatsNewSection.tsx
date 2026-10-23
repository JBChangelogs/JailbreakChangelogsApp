import { useEffect, useState } from 'react'
import { APP_CHANGELOG } from '@shared/appChangelog'
import { Button } from '@renderer/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@renderer/components/ui/popover'
import { InfoIcon, SparklesIcon, UninstallDialog } from '@renderer/components/settings/SettingsSidebar'
import { SETTINGS_LIST, SettingRow, SettingsCard, SettingsPageLayout } from '@renderer/components/settings/SettingsCard'
import { Switch } from '@renderer/components/ui/switch'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { onUpdatePreview, runUpdatePreview } from '@renderer/lib/updatePreview'
import type { UpdaterStatus } from '@shared/desktopApi'

const GROUP_LABELS = {
  added: 'Added',
  changed: 'Changed',
  fixed: 'Fixed',
  removed: 'Removed'
} as const

const GROUP_COLORS: Record<keyof typeof GROUP_LABELS, string> = {
  added: 'text-form-success',
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
  const [previewOpen, setPreviewOpen] = useState(false)
  const [uninstallPreviewOpen, setUninstallPreviewOpen] = useState(false)

  const { user } = useCurrentUser()
  const isOwner = Boolean(user?.flags?.some((f) => f.flag === 'is_owner' && f.enabled))

  useEffect(() => {
    const show = (status: UpdaterStatus): void => {
      if (status.state === 'checking') {
        setChecking(true)
        setFeedback(null)
      } else if (status.state === 'not-available') {
        setChecking(false)
        setFeedback("You're up to date.")
      } else if (status.state === 'available') {
        setChecking(false)
        setFeedback('Update found.')
      } else if (status.state === 'downloading') {
        setChecking(false)
        setFeedback('Downloading update…')
      } else if (status.state === 'downloaded') {
        setChecking(false)
        setFeedback('Installing update…')
      } else if (status.state === 'error') {
        setChecking(false)
        setFeedback('Could not check for updates.')
      }
    }
    const offReal = window.api.updater.onStatus(show)
    const offPreview = onUpdatePreview(show)
    return () => {
      offReal()
      offPreview()
    }
  }, [])

  const currentVersion = APP_CHANGELOG[0]?.version

  return (
    <SettingRow
      title={currentVersion ? `Version ${currentVersion}` : 'Jailbreak Changelogs'}
      description={feedback ?? 'Updates install automatically. Check now to get the latest version right away.'}
      action={
        <>
          <Popover open={previewOpen} onOpenChange={setPreviewOpen}>
            <PopoverAnchor asChild>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={checking}
                onClick={(e) => {
                  if (isOwner && (e.ctrlKey || e.metaKey)) setPreviewOpen(true)
                  else window.api.updater.checkNow()
                }}
              >
                {checking ? 'Checking…' : 'Check for Updates'}
              </Button>
            </PopoverAnchor>
            <PopoverContent align="end" className="flex w-auto flex-col gap-1.5 p-2">
              {(['poll', 'startup'] as const).map((source) => (
                <Button
                  key={source}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="justify-start!"
                  onClick={() => {
                    setPreviewOpen(false)
                    runUpdatePreview(source)
                  }}
                >
                  {source === 'poll' ? 'Preview Banner' : 'Preview Startup'}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="justify-start!"
                onClick={() => {
                  setPreviewOpen(false)
                  setUninstallPreviewOpen(true)
                }}
              >
                Preview Uninstall
              </Button>
            </PopoverContent>
          </Popover>
          <UninstallDialog open={uninstallPreviewOpen} onOpenChange={setUninstallPreviewOpen} preview />
        </>
      }
    />
  )
}

function UsageDataRow(): React.JSX.Element {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  useEffect(() => {
    void window.api.analytics.isEnabled().then(setEnabled)
  }, [])

  const toggle = (next: boolean): void => {
    setEnabled(next)
    window.api.analytics.setEnabled(next)
  }

  return (
    <SettingRow
      highlight
      title="Send Usage Data"
      description="Share how you use the app, like which tabs you open and when alerts fire, to help improve it. Never includes your messages or what you search for."
      action={<Switch checked={enabled ?? false} disabled={enabled === null} onCheckedChange={toggle} />}
    />
  )
}

export function WhatsNewSection(): React.JSX.Element {
  return (
    <SettingsPageLayout>
      <SettingsCard title="About" icon={InfoIcon}>
        <div className={SETTINGS_LIST}>
          <CheckForUpdatesRow />
          <UsageDataRow />
        </div>
      </SettingsCard>

      <SettingsCard
        title="What's New"
        icon={SparklesIcon}
        description={<p>What&apos;s changed in each version of this app.</p>}
      >
        <div className="space-y-3">
          {APP_CHANGELOG.map((entry) => (
            <div key={entry.version} className="rounded-lg border border-border-card bg-tertiary-bg p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold text-primary-text">Version {entry.version}</h3>
                <span className="shrink-0 text-sm text-secondary-text">{formatDate(entry.date)}</span>
              </div>

              <div className="mt-3 space-y-3">
                {(Object.keys(GROUP_LABELS) as (keyof typeof GROUP_LABELS)[]).map((group) => {
                  const items = entry[group]
                  if (!items || items.length === 0) return null
                  return (
                    <div key={group}>
                      <h4 className={`text-xs font-bold tracking-wide uppercase ${GROUP_COLORS[group]}`}>
                        {GROUP_LABELS[group]}
                      </h4>
                      <ul className="mt-1.5 space-y-1.5">
                        {items.map((item, i) => (
                          <li key={i} className="flex gap-2 text-sm text-secondary-text">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-tertiary-text" />
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
      </SettingsCard>
    </SettingsPageLayout>
  )
}
