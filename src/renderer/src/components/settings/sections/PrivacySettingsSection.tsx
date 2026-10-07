import { useEffect, useState } from 'react'
import { Switch } from '@renderer/components/ui/switch'
import { useAccountSettings } from '@renderer/hooks/useAccountSettings'
import { CategorySettingsList } from './CategorySettingsList'
import { BlockedUsersSection } from './BlockedUsersSection'

const SHOWN_ELSEWHERE = new Set(['hide_roblox_activity'])

function UsageDataToggle(): React.JSX.Element {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  useEffect(() => {
    void window.api.analytics.isEnabled().then(setEnabled)
  }, [])

  const toggle = (next: boolean): void => {
    setEnabled(next)
    window.api.analytics.setEnabled(next)
  }

  return (
    <div className="mt-6">
      <h2 className="text-xs font-bold tracking-wide text-quaternary-text uppercase">This app</h2>
      <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-quaternary-bg">
        <div className="min-w-0">
          <span className="text-sm text-primary-text">Send usage data</span>
          <p className="mt-0.5 text-xs text-tertiary-text">
            Share how you use the app, like which tabs you open and when alerts fire, to help improve it. Linked to
            your account while you're logged in. Never includes your messages or what you search for.
          </p>
        </div>
        <Switch checked={enabled ?? false} disabled={enabled === null} onCheckedChange={toggle} />
      </label>
    </div>
  )
}

export function PrivacySettingsSection(): React.JSX.Element {
  const { settings, loading, error, pending, toggle } = useAccountSettings()

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <h1 className="text-xl font-bold text-primary-text">Privacy</h1>
      <p className="mt-1 text-sm text-tertiary-text">
        Controls what other users can see and do on your profile.
      </p>

      <CategorySettingsList
        settings={settings}
        loading={loading}
        error={error}
        pending={pending}
        toggle={(name, next) => void toggle(name, next)}
        categoryFilter={(name) => name.toLowerCase() === 'privacy'}
        excludeSettings={SHOWN_ELSEWHERE}
      />

      <UsageDataToggle />

      <BlockedUsersSection />
    </div>
  )
}
