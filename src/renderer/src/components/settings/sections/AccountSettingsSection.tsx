import { useAccountSettings } from '@renderer/hooks/useAccountSettings'
import { CategorySettingsList } from './CategorySettingsList'
import { ProfilePreviewSection } from './ProfilePreviewSection'

const SHOWN_ELSEWHERE = new Set(['hide_roblox_activity', 'custom_avatar', 'custom_banner'])

export function AccountSettingsSection(): React.JSX.Element {
  const { settings, loading, error, pending, toggle } = useAccountSettings()

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <h1 className="text-xl font-bold text-primary-text">Account</h1>
      <p className="mt-1 text-sm text-tertiary-text">General preferences for your account.</p>

      <div className="mt-3">
        <ProfilePreviewSection />
      </div>

      <CategorySettingsList
        settings={settings}
        loading={loading}
        error={error}
        pending={pending}
        toggle={(name, next) => void toggle(name, next)}
        categoryFilter={(name) => name.toLowerCase() !== 'privacy'}
        excludeSettings={SHOWN_ELSEWHERE}
      />
    </div>
  )
}
