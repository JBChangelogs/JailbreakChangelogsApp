import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { accountApi, type SupporterHistoryEntry } from '@renderer/lib/accountApi'
import { refreshCurrentUser } from '@renderer/lib/currentUser'
import { supporterBadgeUrl } from '@renderer/lib/badgeAssets'
import { showToast } from '@renderer/lib/toast'
import { Button } from '@renderer/components/ui/button'
import { Switch } from '@renderer/components/ui/switch'
import { SettingRow, SettingsCard } from '@renderer/components/settings/SettingsCard'

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

function formatDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function HistoryIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3 2" />
    </svg>
  )
}

let emailStatus: { linked: boolean; enabled: boolean } | null = null
const emailListeners = new Set<(status: typeof emailStatus) => void>()

function setEmailStatus(next: typeof emailStatus): void {
  emailStatus = next
  emailListeners.forEach((l) => l(next))
}

function useEmailStatus(): { status: typeof emailStatus; error: boolean } {
  const { token } = useAuth()
  const [status, setStatus] = useState(emailStatus)
  const [error, setError] = useState(false)

  useEffect(() => {
    emailListeners.add(setStatus)
    return () => {
      emailListeners.delete(setStatus)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    Promise.all([accountApi.emailLinked(token), accountApi.emailNotifications(token)])
      .then(([linked, notifications]) => setEmailStatus({ linked: linked.linked, enabled: notifications.enabled }))
      .catch(() => setError(true))
  }, [token])

  return { status, error }
}

export function EmailNotificationRow(): React.JSX.Element {
  const { token } = useAuth()
  const { status, error } = useEmailStatus()
  const [busy, setBusy] = useState(false)

  const toggle = async (enabled: boolean): Promise<void> => {
    if (!token || !status) return
    setBusy(true)
    try {
      await accountApi.setEmailNotifications(token, enabled)
      setEmailStatus({ linked: status.linked || enabled, enabled })
    } catch (err) {
      showToast('Could not update email notifications', { description: errorMessage(err, 'Please try again.') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingRow
      highlight
      title="Email Notifications"
      description={
        error
          ? 'Could not load email settings. Please try again.'
          : !status || status.linked
            ? 'Receive important updates and notifications via email.'
            : 'Link an email in your settings on the website to get notifications by email.'
      }
      action={
        <Switch
          aria-label="Email notifications"
          checked={status?.enabled ?? false}
          disabled={!status || !status.linked || busy}
          onCheckedChange={(checked) => void toggle(checked)}
        />
      }
    />
  )
}

export function SupporterTierRow({
  level,
  name,
  detail,
  actions
}: {
  level: number
  name: string
  detail?: string
  actions?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-border-card bg-tertiary-bg p-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {level > 0 ? (
          <img src={supporterBadgeUrl(level)} alt="" className="size-7 shrink-0 object-contain" />
        ) : (
          <span className="size-7 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary-text">{name}</p>
          {detail && <p className="mt-0.5 text-sm text-secondary-text">{detail}</p>}
        </div>
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

export function SupporterHistoryCard(): React.JSX.Element | null {
  const { token } = useAuth()
  const { user } = useCurrentUser()
  const [history, setHistory] = useState<SupporterHistoryEntry[]>([])
  const [changing, setChanging] = useState<number | null>(null)
  const currentLevel = user?.premiumtype ?? 0

  useEffect(() => {
    if (!token) return
    accountApi
      .supporterHistory(token)
      .then(setHistory)
      .catch(() => {})
  }, [token])

  if (history.length === 0) return null

  const changeLevel = async (level: number): Promise<void> => {
    if (!token) return
    setChanging(level)
    try {
      await accountApi.setSupporterLevel(token, level)
      await refreshCurrentUser(token).catch(() => {})
      showToast(level === 0 ? 'Supporter tier removed' : `Switched to Supporter Tier ${level}`)
    } catch (err) {
      showToast('Could not change supporter tier', { description: errorMessage(err, 'Please try again.') })
    } finally {
      setChanging(null)
    }
  }

  const sorted = [...history].sort((a, b) => b.level - a.level || (b.created_at ?? 0) - (a.created_at ?? 0))

  return (
    <SettingsCard
      title="Supporter History"
      icon={HistoryIcon}
      description={<p>Previous supporter tiers recorded on your account.</p>}
    >
      <div className="flex flex-col gap-3">
        {sorted.map((entry, index) => {
          const upgrade = entry.level > currentLevel
          return (
            <SupporterTierRow
              key={`${entry.level}-${entry.created_at}-${index}`}
              level={entry.level}
              name={`Supporter Tier ${entry.level}`}
              detail={entry.created_at ? `Added ${formatDate(entry.created_at)}` : undefined}
              actions={
                entry.level === currentLevel ? (
                  <span className="inline-flex h-10 items-center rounded-lg bg-button-info/15 px-4 text-sm font-semibold text-link">
                    Current
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant={upgrade ? 'default' : 'secondary'}
                    disabled={changing !== null}
                    onClick={() => void changeLevel(entry.level)}
                  >
                    {changing === entry.level
                      ? upgrade
                        ? 'Upgrading…'
                        : 'Downgrading…'
                      : upgrade
                        ? 'Upgrade'
                        : 'Downgrade'}
                  </Button>
                )
              }
            />
          )
        })}
        {currentLevel > 0 && (
          <SupporterTierRow
            level={0}
            name="Free Tier"
            detail="Remove your current supporter tier."
            actions={
              <Button type="button" variant="secondary" disabled={changing !== null} onClick={() => void changeLevel(0)}>
                {changing === 0 ? 'Downgrading…' : 'Downgrade'}
              </Button>
            }
          />
        )}
      </div>
    </SettingsCard>
  )
}
