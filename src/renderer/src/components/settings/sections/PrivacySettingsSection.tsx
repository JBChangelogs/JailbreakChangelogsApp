import { useAccountSettings } from '@renderer/hooks/useAccountSettings'
import { CategorySettingsList } from './CategorySettingsList'
import { BlockedUsersSection } from './BlockedUsersSection'

const SHOWN_ELSEWHERE = new Set(['hide_roblox_activity'])

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

      <BlockedUsersSection />
    </div>
  )
}
