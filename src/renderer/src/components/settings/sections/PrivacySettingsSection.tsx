import { useAccountSettings } from '@renderer/hooks/useAccountSettings'
import { CategorySettingsList } from './CategorySettingsList'
import { BlockedUsersSection } from './BlockedUsersSection'
import { SettingsPageLayout } from '@renderer/components/settings/SettingsCard'

const SHOWN_ELSEWHERE = new Set(['hide_roblox_activity'])

export function PrivacySettingsSection(): React.JSX.Element {
  const { settings, loading, error, pending, toggle } = useAccountSettings()

  return (
    <SettingsPageLayout>
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
    </SettingsPageLayout>
  )
}
