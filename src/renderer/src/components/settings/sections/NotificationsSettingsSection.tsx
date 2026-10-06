import { useState } from 'react'
import { Switch } from '@renderer/components/ui/switch'
import { useNotificationPreferences } from '@renderer/hooks/useNotificationPreferences'
import {
  getDesktopNotificationsEnabled,
  setDesktopNotificationsEnabled,
  getInAppNotificationsEnabled,
  setInAppNotificationsEnabled
} from '@renderer/lib/localPreferences'
import { NOTIFICATION_PREFERENCE_CATEGORIES } from '@shared/notification'

export function NotificationsSettingsSection(): React.JSX.Element {
  const [desktopEnabled, setDesktopEnabled] = useState(getDesktopNotificationsEnabled)
  const [inAppEnabled, setInAppEnabled] = useState(getInAppNotificationsEnabled)
  const { isEnabled, toggleCategory, loading, error, pending } = useNotificationPreferences()

  const toggleDesktop = (next: boolean): void => {
    setDesktopEnabled(next)
    setDesktopNotificationsEnabled(next)
  }

  const toggleInApp = (next: boolean): void => {
    setInAppEnabled(next)
    setInAppNotificationsEnabled(next)
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <h1 className="text-xl font-bold text-primary-text">Notifications</h1>
      <p className="mt-1 text-sm text-tertiary-text">
        Controls how the app notifies you
      </p>

      <div className="mt-6 space-y-0.5">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-quaternary-bg">
          <div className="min-w-0">
            <span className="text-sm text-primary-text">In-app notifications</span>
            <p className="mt-0.5 text-xs text-tertiary-text">
              Show the corner toast popup for new messages and alerts while using the app. The bell
              icon's list is unaffected either way.
            </p>
          </div>
          <Switch checked={inAppEnabled} onCheckedChange={toggleInApp} />
        </label>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-quaternary-bg">
          <div className="min-w-0">
            <span className="text-sm text-primary-text">Desktop notifications</span>
            <p className="mt-0.5 text-xs text-tertiary-text">
              Show a native OS notification for new messages and alerts when the app isn't focused.
              Independent of in-app notifications above.
            </p>
          </div>
          <Switch checked={desktopEnabled} onCheckedChange={toggleDesktop} />
        </label>
      </div>

      <h2 className="mt-8 text-xs font-bold tracking-wide text-quaternary-text uppercase">Notify me about</h2>
      <p className="mt-0.5 text-xs text-tertiary-text">
        Which events actually generate a notification at all, synced to your account.
      </p>
      {loading && <p className="mt-3 text-sm text-quaternary-text">Loading…</p>}
      {error && <p className="mt-3 text-sm text-form-error">{error}</p>}
      {!loading && (
        <div className="mt-3 space-y-0.5">
          {NOTIFICATION_PREFERENCE_CATEGORIES.map((category) => (
            <label
              key={category.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-quaternary-bg"
            >
              <div className="min-w-0">
                <span className="text-sm text-primary-text">{category.label}</span>
                <p className="mt-0.5 text-xs text-tertiary-text">{category.description}</p>
              </div>
              <Switch
                checked={isEnabled(category.id)}
                disabled={pending.has(category.id)}
                onCheckedChange={(checked) => void toggleCategory(category.id, checked)}
              />
            </label>
          ))}

        </div>
      )}
    </div>
  )
}
