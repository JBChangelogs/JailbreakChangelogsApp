import { useAccountSettings } from '@renderer/hooks/useAccountSettings'
import { CategorySettingsList } from './CategorySettingsList'
import { ProfilePreviewSection } from './ProfilePreviewSection'
import { AccentColorSetting, BackgroundButton } from './AppearanceSettings'
import { SettingsPageLayout } from '@renderer/components/settings/SettingsCard'

const SHOWN_ELSEWHERE = new Set(['hide_roblox_activity', 'custom_avatar', 'custom_banner'])

export function AccountSettingsSection(): React.JSX.Element {
  const { settings, loading, error, pending, toggle } = useAccountSettings()

  return (
    <SettingsPageLayout>
      <ProfilePreviewSection />

      <CategorySettingsList
        settings={settings}
        loading={loading}
        error={error}
        pending={pending}
        toggle={(name, next) => void toggle(name, next)}
        categoryFilter={(name) => name.toLowerCase() !== 'privacy'}
        excludeSettings={SHOWN_ELSEWHERE}
        renderBefore={(name) => name === 'custom_background' && <AccentColorSetting />}
        renderAction={(name) => (name === 'custom_background' ? <BackgroundButton /> : undefined)}
        renderEnd={(category, names) =>
          category.toLowerCase() === 'appearance' && !names.includes('custom_background') && <AccentColorSetting />
        }
      />
    </SettingsPageLayout>
  )
}
