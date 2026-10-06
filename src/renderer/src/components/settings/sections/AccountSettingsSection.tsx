import { usePreferences } from '@renderer/contexts/PreferencesContext'
import { Switch } from '@renderer/components/ui/switch'
import { useAccountSettings } from '@renderer/hooks/useAccountSettings'
import { CategorySettingsList } from './CategorySettingsList'
import { ProfilePreviewSection } from './ProfilePreviewSection'

const SHOWN_ELSEWHERE = new Set(['hide_roblox_activity', 'custom_avatar', 'custom_banner'])

export function AccountSettingsSection(): React.JSX.Element {
  const { settings, loading, error, pending, toggle } = useAccountSettings()
  const { twemojiEnabled, setTwemojiEnabled } = usePreferences()

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <h1 className="text-xl font-bold text-primary-text">Account</h1>
      <p className="mt-1 text-sm text-tertiary-text">General preferences for your account.</p>

      <div className="mt-3">
        <ProfilePreviewSection />
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-quaternary-bg">
        <div className="min-w-0">
          <span className="text-sm text-primary-text">Use Twemoji</span>
          <p className="mt-0.5 text-xs text-tertiary-text">
            Render emoji with Twitter's emoji set instead of your system's
          </p>
        </div>
        <Switch checked={twemojiEnabled} onCheckedChange={setTwemojiEnabled} />
      </label>

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
