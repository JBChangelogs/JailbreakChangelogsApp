import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { usePreferences, type RichPresencePreferenceKey } from '@renderer/contexts/PreferencesContext'
import { Switch } from '@renderer/components/ui/switch'
import { RichPresencePreview } from './RichPresencePreview'
import { settingsApi } from '@renderer/lib/settingsApi'
import {
  ensureUserSettingsLoaded,
  findUserSetting,
  getCachedUserSettings,
  setCachedUserSetting,
  subscribeUserSettings
} from '@renderer/lib/userSettings'

const DISPLAY_TOGGLES: { key: RichPresencePreferenceKey; label: string; description: string }[] = [
  {
    key: 'rich_presence_show_details',
    label: 'Show what page you\'re viewing',
    description: 'The top line of your Discord status, e.g. "Checking the value list".'
  },
  {
    key: 'rich_presence_show_state',
    label: 'Show which app tab you\'re using',
    description: 'The second line, e.g. "Messages (App)".'
  },
  {
    key: 'rich_presence_show_roblox_badge',
    label: 'Show the Roblox activity badge',
    description: 'The small controller icon and "Inside Jailbreak"/"Inside Trading" hover text.'
  },
  {
    key: 'rich_presence_show_join_button',
    label: 'Show the Join Server button',
    description: 'Lets friends join your exact Jailbreak server from your Discord status.'
  },
  {
    key: 'rich_presence_show_website_button',
    label: 'Show the "Visit website" button',
    description: ''
  }
]

export function RichPresenceSettingsSection(): React.JSX.Element {
  const { token } = useAuth()
  const { richPresence, setRichPresence } = usePreferences()

  const [hideRobloxActivity, setHideRobloxActivityState] = useState<boolean | undefined>(() =>
    findUserSetting('hide_roblox_activity')
  )
  const [loadingSetting, setLoadingSetting] = useState(false)
  const [settingError, setSettingError] = useState<string | null>(null)
  const [pendingRobloxSetting, setPendingRobloxSetting] = useState(false)

  useEffect(() => {
    return subscribeUserSettings(() => setHideRobloxActivityState(findUserSetting('hide_roblox_activity')))
  }, [])

  useEffect(() => {
    if (!token || getCachedUserSettings()) return
    setLoadingSetting(true)
    setSettingError(null)
    ensureUserSettingsLoaded(token)
      .catch((err: unknown) => setSettingError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoadingSetting(false))
  }, [token])

  const toggleShareRobloxActivity = async (share: boolean): Promise<void> => {
    if (!token) return
    const nextHidden = !share
    const previous = hideRobloxActivity
    setCachedUserSetting('hide_roblox_activity', nextHidden)
    setPendingRobloxSetting(true)
    try {
      await settingsApi.updateMine(token, [{ name: 'hide_roblox_activity', value: nextHidden }])
    } catch {
      if (previous !== undefined) setCachedUserSetting('hide_roblox_activity', previous)
    } finally {
      setPendingRobloxSetting(false)
    }
  }

  const masterEnabled = richPresence.rich_presence_enabled

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <h1 className="text-xl font-bold text-primary-text">Rich Presence</h1>
      <p className="mt-1 text-sm text-tertiary-text">
        Controls what Discord shows about your activity here.
      </p>

      <div className="mt-4">
        <RichPresencePreview richPresence={richPresence} hideRobloxActivity={!!hideRobloxActivity} />
      </div>

      <div className="mt-4 space-y-0.5">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-quaternary-bg">
          <div className="min-w-0">
            <span className="text-sm text-primary-text">Enable Discord Rich Presence</span>
            <p className="mt-0.5 text-xs text-tertiary-text">
              Turning this off clears your Discord status entirely and ignores
              everything below.
            </p>
          </div>
          <Switch
            checked={masterEnabled}
            onCheckedChange={(checked) => setRichPresence('rich_presence_enabled', checked)}
          />
        </label>
      </div>

      <h2 className="mt-6 text-xs font-bold tracking-wide text-quaternary-text uppercase">
        What to show
      </h2>
      <div className={`mt-3 space-y-0.5 ${masterEnabled ? '' : 'pointer-events-none opacity-40'}`}>
        {DISPLAY_TOGGLES.map(({ key, label, description }) => (
          <label
            key={key}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-quaternary-bg"
          >
            <div className="min-w-0">
              <span className="text-sm text-primary-text">{label}</span>
              {description && <p className="mt-0.5 text-xs text-tertiary-text">{description}</p>}
            </div>
            <Switch
              checked={richPresence[key]}
              disabled={!masterEnabled}
              onCheckedChange={(checked) => setRichPresence(key, checked)}
            />
          </label>
        ))}
      </div>

      <h2 className="mt-6 text-xs font-bold tracking-wide text-quaternary-text uppercase">
        Roblox activity
      </h2>
      {loadingSetting && <p className="mt-3 text-sm text-quaternary-text">Loading…</p>}
      {settingError && <p className="mt-3 text-sm text-form-error">{settingError}</p>}
      {!loadingSetting && !settingError && hideRobloxActivity !== undefined && (
        <div className="mt-3 space-y-0.5">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-quaternary-bg">
            <div className="min-w-0">
              <span className="text-sm text-primary-text">Share which Roblox game and server you're in</span>
              <p className="mt-0.5 text-xs text-tertiary-text">
                Also used elsewhere (not just Discord) to let others see your Roblox activity.
                Turning this off always takes effect, even with Rich Presence off above.
              </p>
            </div>
            <Switch
              checked={!hideRobloxActivity}
              disabled={pendingRobloxSetting}
              onCheckedChange={(checked) => void toggleShareRobloxActivity(checked)}
            />
          </label>
        </div>
      )}
    </div>
  )
}
