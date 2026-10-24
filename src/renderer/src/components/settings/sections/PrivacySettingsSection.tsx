import { useState } from 'react'
import { useAccountSettings } from '@renderer/hooks/useAccountSettings'
import { Switch } from '@renderer/components/ui/switch'
import { SearchInput } from '@renderer/components/ui/search-input'
import { MessagesIcon } from '@renderer/components/NavBar'
import { GiftIcon, ShieldIcon, UserIcon } from '@renderer/components/settings/SettingsSidebar'
import { SETTINGS_LIST, SettingRow, SettingsCard, SettingsPageLayout, formatSettingName } from '@renderer/components/settings/SettingsCard'
import type { SettingItem } from '@shared/settings'
import { BlockedUsersSection } from './BlockedUsersSection'

const SHOWN_ELSEWHERE = new Set(['hide_roblox_activity'])

function EyeIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

interface PrivacyGroup {
  title: string
  description: string
  icon: (props: { className?: string }) => React.JSX.Element
  settings: string[]
}

const PRIVACY_GROUPS: PrivacyGroup[] = [
  {
    title: 'Messages',
    description: 'Who can message you, and what they see while you chat.',
    icon: MessagesIcon,
    settings: ['dms_allowed', 'global_dms_allowed', 'send_typing_indicators', 'send_read_receipts']
  },
  {
    title: 'Activity',
    description: 'What others can see about when you are online.',
    icon: EyeIcon,
    settings: ['hide_presence']
  },
  {
    title: 'Profile',
    description: 'Who can see your profile, and what shows on it.',
    icon: UserIcon,
    settings: ['profile_public', 'show_recent_comments', 'allow_profile_comments', 'hide_favorites', 'hide_followers', 'hide_following']
  },
  {
    title: 'Gifts',
    description: 'Whether other people can send you gifts.',
    icon: GiftIcon,
    settings: ['allow_gifting']
  }
]

const GROUPED = new Set(PRIVACY_GROUPS.flatMap((group) => group.settings))

export function PrivacySettingsSection(): React.JSX.Element {
  const { settings, loading, error, pending, toggle } = useAccountSettings()
  const [query, setQuery] = useState('')

  const privacySettings = (
    Object.values(settings ?? {}).find((category) => category.name.toLowerCase() === 'privacy')?.settings ?? []
  ).filter((setting) => !SHOWN_ELSEWHERE.has(setting.name))
  const byName = new Map(privacySettings.map((setting) => [setting.name, setting]))

  const needle = query.trim().toLowerCase()
  const matches = (setting: SettingItem): boolean =>
    !needle ||
    formatSettingName(setting.name).toLowerCase().includes(needle) ||
    setting.description.toLowerCase().includes(needle)

  const groups = [
    ...PRIVACY_GROUPS.map((group) => ({
      ...group,
      items: group.settings.map((name) => byName.get(name)).filter((setting): setting is SettingItem => !!setting)
    })),
    {
      title: 'Other',
      description: 'More privacy options.',
      icon: ShieldIcon,
      items: privacySettings.filter((setting) => !GROUPED.has(setting.name)).sort((a, b) => a.index - b.index)
    }
  ]
    .map((group) => ({ ...group, items: group.items.filter(matches) }))
    .filter((group) => group.items.length > 0)

  return (
    <SettingsPageLayout>
      <SearchInput value={query} onChange={setQuery} placeholder="Search privacy settings..." />

      {loading && <p className="text-sm text-quaternary-text">Loading…</p>}
      {error && <p className="text-sm text-form-error">{error}</p>}
      {!loading && !error && needle && groups.length === 0 && (
        <p className="py-6 text-center text-sm text-quaternary-text">No privacy settings match &quot;{query.trim()}&quot;.</p>
      )}

      {!loading &&
        !error &&
        groups.map((group) => (
          <SettingsCard key={group.title} title={group.title} icon={group.icon} description={<p>{group.description}</p>}>
            <div className={SETTINGS_LIST}>
              {group.items.map((setting) => (
                <SettingRow
                  key={setting.name}
                  highlight
                  title={formatSettingName(setting.name)}
                  description={setting.description}
                  action={
                    <Switch
                      checked={setting.value}
                      disabled={pending.has(setting.name)}
                      onCheckedChange={(checked) => void toggle(setting.name, checked)}
                    />
                  }
                />
              ))}
            </div>
          </SettingsCard>
        ))}

      {!needle && <BlockedUsersSection />}
    </SettingsPageLayout>
  )
}
