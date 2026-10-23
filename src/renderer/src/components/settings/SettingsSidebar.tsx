import { useEffect, useState } from 'react'
import { useSettingsPage, type SettingsSectionId } from '@renderer/contexts/SettingsPageContext'
import { Button } from '@renderer/components/ui/button'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { showToast } from '@renderer/lib/toast'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'

export function ShieldIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3 4.5 6v6c0 4.5 3.2 7.6 7.5 9 4.3-1.4 7.5-4.5 7.5-9V6L12 3Z"
      />
    </svg>
  )
}

export function BellIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
      />
    </svg>
  )
}

function GamepadIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="6" width="20" height="12" rx="6" />
      <path strokeLinecap="round" d="M7.5 10v4M5.5 12h4" />
      <circle cx="16" cy="9.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function InfoIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 11v5m0-8h.01" />
    </svg>
  )
}

export function SparklesIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3ZM5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8L5 16Z"
      />
    </svg>
  )
}

export function PaletteIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-1.8a1.7 1.7 0 0 0-1.2 2.9 1.7 1.7 0 0 1-1.2 3.1H12Z"
      />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function BackIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19 8 12l7-7" />
    </svg>
  )
}

export function TrashIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3" />
    </svg>
  )
}

export function UninstallDialog({
  open,
  onOpenChange,
  preview = false
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  preview?: boolean
}): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const [purge, setPurge] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setBusy(false)
    setPurge(false)
    setError(null)
  }, [open])

  const uninstall = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    if (preview) {
      setTimeout(() => {
        onOpenChange(false)
        showToast('Uninstall preview', {
          description: purge ? 'The app and its data would have been removed.' : 'The app would have been removed.'
        })
      }, 1500)
      return
    }
    try {
      await window.api.uninstall.run(purge)
    } catch (err) {
      setError(typeof err === 'string' ? err : "The app couldn't be uninstalled. Please try again.")
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Uninstall Jailbreak Changelogs?</DialogTitle>
          <DialogDescription>The app will close and be removed from this computer.</DialogDescription>
        </DialogHeader>
        <div className="px-5 py-4 text-sm text-secondary-text">
          <p>
            Your account isn&apos;t affected.{' '}
            {purge
              ? 'Your settings, sign-in and other app data will be removed from this computer.'
              : 'Your settings stay on this computer in case you reinstall.'}
          </p>
          <label className="mt-4 flex items-start gap-3 rounded-lg border border-border-card bg-secondary-bg px-3 py-2.5">
            <Checkbox
              checked={purge}
              disabled={busy}
              onCheckedChange={(checked) => setPurge(checked === true)}
              className="mt-0.5 h-5 w-5 rounded-lg"
            />
            <span className="min-w-0">
              <span className="block font-medium text-primary-text">Also remove my settings and data</span>
              <span className="mt-0.5 block text-xs text-tertiary-text">
                Signs you out and deletes saved settings, caches and downloaded files.
              </span>
            </span>
          </label>
          {error && <p className="mt-3 text-xs text-status-error">{error}</p>}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border-primary px-5 py-4">
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => void uninstall()}>
            {busy ? 'Uninstalling…' : 'Uninstall'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function UninstallButton(): React.JSX.Element | null {
  const [supported, setSupported] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void window.api.uninstall
      .supported()
      .then((ok) => !cancelled && setSupported(ok))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!supported) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-secondary-text transition-colors hover:bg-status-error/10 hover:text-status-error"
      >
        <TrashIcon className="h-4 w-4 shrink-0" />
        Uninstall
      </button>
      <UninstallDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

export function UserIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.3 3.1-6 7-6s7 2.7 7 6"
      />
    </svg>
  )
}

export function GiftIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 12v9H4v-9M2 7h20v5H2V7Zm10 0v14M12 7c-1-3-3.5-4-5-2.5S6 8 9 8h3Zm0 0c1-3 3.5-4 5-2.5S18 8 15 8h-3Z"
      />
    </svg>
  )
}

const SECTIONS: { id: SettingsSectionId; label: string; icon: (props: { className?: string }) => React.JSX.Element }[] = [
  { id: 'account', label: 'Profile', icon: UserIcon },
  { id: 'display', label: 'Display', icon: PaletteIcon },
  { id: 'privacy', label: 'Privacy', icon: ShieldIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'richPresence', label: 'Rich Presence', icon: GamepadIcon },
  { id: 'gifts', label: 'Supporter', icon: GiftIcon },
  { id: 'whatsNew', label: 'About', icon: InfoIcon }
]

export function SettingsSidebar(): React.JSX.Element {
  const { section, setSection, close } = useSettingsPage()

  return (
    <div className="flex w-60 shrink-0 flex-col border-r border-border-primary bg-secondary-bg">
      <div className="px-4 py-4">
        <h1 className="text-xs font-bold tracking-wide text-quaternary-text uppercase">Settings</h1>
      </div>

      <nav className="flex-1 space-y-0.5 px-2">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
              section === id
                ? 'bg-button-info/15 text-primary-text'
                : 'text-secondary-text hover:bg-quaternary-bg hover:text-primary-text'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <div className="px-2 pb-2">
        <UninstallButton />
      </div>

      <div className="border-t border-border-primary p-2">
        <button
          type="button"
          onClick={close}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
        >
          <BackIcon className="h-4 w-4 shrink-0" />
          Back to app
        </button>
      </div>
    </div>
  )
}
