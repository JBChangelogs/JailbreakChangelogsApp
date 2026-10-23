import { useState } from 'react'
import { Switch } from '@renderer/components/ui/switch'
import { useNotificationPreferences } from '@renderer/hooks/useNotificationPreferences'
import {
  getDesktopNotificationsEnabled,
  setDesktopNotificationsEnabled,
  getInAppNotificationsEnabled,
  setInAppNotificationsEnabled
} from '@renderer/lib/localPreferences'
import { SearchInput } from '@renderer/components/ui/search-input'
import { useSearchTracking } from '@renderer/lib/analytics'
import { NOTIFICATION_PREFERENCE_GROUPS } from '@shared/notification'
import {
  SETTINGS_LIST,
  SettingRow,
  SettingsCard,
  SettingsPageLayout,
  SettingsSubsectionHeading
} from '@renderer/components/settings/SettingsCard'
import { BellIcon } from '@renderer/components/settings/SettingsSidebar'
import { EmailNotificationRow } from './SupporterSections'

function ChevronIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  )
}

function icon(d: string) {
  return function GroupIcon({ className }: { className?: string }): React.JSX.Element {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d={d} />
      </svg>
    )
  }
}

const GROUP_ICONS: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  trading: icon(
    'M5.825 16L7.7 17.875q.275.275.275.688t-.275.712q-.3.3-.712.3t-.713-.3L2.7 15.7q-.15-.15-.213-.325T2.426 15t.063-.375t.212-.325l3.6-3.6q.3-.3.7-.287t.7.312q.275.3.288.7t-.288.7L5.825 14H12q.425 0 .713.288T13 15t-.288.713T12 16zm12.35-6H12q-.425 0-.712-.288T11 9t.288-.712T12 8h6.175L16.3 6.125q-.275-.275-.275-.687t.275-.713q.3-.3.713-.3t.712.3L21.3 8.3q.15.15.212.325t.063.375t-.063.375t-.212.325l-3.6 3.6q-.3.3-.7.288t-.7-.313q-.275-.3-.288-.7t.288-.7z'
  ),
  'comments-and-followers': icon(
    'M21 20.6q-.2 0-.375-.075T20.3 20.3L18 18H8q-.825 0-1.412-.587T6 16v-1h11q.825 0 1.413-.587T19 13V6h1q.825 0 1.413.588T22 8v11.575q0 .45-.3.738t-.7.287m-18-5q-.4 0-.7-.287t-.3-.738V4q0-.825.588-1.412T4 2h11q.825 0 1.413.588T17 4v7q0 .825-.587 1.413T15 13H6l-2.3 2.3q-.15.15-.325.225T3 15.6'
  ),
  'inventory-and-items': icon(
    'M5 22q-.825 0-1.412-.587T3 20V8.725q-.45-.275-.725-.712T2 7V4q0-.825.588-1.412T4 2h16q.825 0 1.413.588T22 4v3q0 .575-.275 1.013T21 8.724V20q0 .825-.587 1.413T19 22zM4 7h16V4H4zm6 7h4q.425 0 .713-.288T15 13t-.288-.712T14 12h-4q-.425 0-.712.288T9 13t.288.713T10 14'
  ),
  other: icon(
    'M5 19q-.425 0-.712-.288T4 18t.288-.712T5 17h1v-7q0-2.075 1.25-3.687T10.5 4.2v-.7q0-.625.438-1.062T12 2t1.063.438T13.5 3.5v.7q2 .5 3.25 2.113T18 10v7h1q.425 0 .713.288T20 18t-.288.713T19 19zm7 3q-.825 0-1.412-.587T10 20h4q0 .825-.587 1.413T12 22'
  )
}

export function NotificationsSettingsSection(): React.JSX.Element {
  const [desktopEnabled, setDesktopEnabled] = useState(getDesktopNotificationsEnabled)
  const [inAppEnabled, setInAppEnabled] = useState(getInAppNotificationsEnabled)
  const { isEnabled, setCategories, loading, error, pending } = useNotificationPreferences()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const query = search.trim().toLowerCase()
  const groups = NOTIFICATION_PREFERENCE_GROUPS.map((group) => ({
    ...group,
    categories: query
      ? group.categories.filter((c) => `${c.label} ${c.description}`.toLowerCase().includes(query))
      : group.categories
  })).filter((group) => group.categories.length > 0)
  useSearchTracking(
    'notification_settings',
    search,
    groups.reduce((n, g) => n + g.categories.length, 0)
  )

  const toggleExpanded = (id: string): void =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleDesktop = (next: boolean): void => {
    setDesktopEnabled(next)
    setDesktopNotificationsEnabled(next)
  }

  const toggleInApp = (next: boolean): void => {
    setInAppEnabled(next)
    setInAppNotificationsEnabled(next)
  }

  return (
    <SettingsPageLayout>
      <SettingsCard title="Notification Preferences" icon={BellIcon}>
        <div className={SETTINGS_LIST}>
          <SettingRow
            highlight
            title="In-App Notifications"
            description="Show the corner toast popup for new messages and alerts while using the app. The bell icon's list is unaffected either way."
            action={<Switch checked={inAppEnabled} onCheckedChange={toggleInApp} />}
          />
          <SettingRow
            highlight
            title="Desktop Notifications"
            description="Show a native notification for new messages and alerts when the app isn't focused. Independent of in-app notifications above."
            action={<Switch checked={desktopEnabled} onCheckedChange={toggleDesktop} />}
          />
          <EmailNotificationRow />

          <section>
            <SettingsSubsectionHeading title="What to notify you about" />
            <p className="mb-3 text-sm text-secondary-text">
              Turn a whole group on or off, or open it to choose individual notifications.
            </p>
            {loading && <p className="text-sm text-quaternary-text">Loading…</p>}
            {error && <p className="text-sm text-form-error">{error}</p>}
            {!loading && (
              <>
                <SearchInput value={search} onChange={setSearch} placeholder="Search notifications..." />
                <div className="mt-3 space-y-2">
                  {groups.length === 0 && (
                    <p className="py-4 text-center text-sm text-quaternary-text">No notifications match your search.</p>
                  )}
                  {groups.map((group) => {
                    const ids = group.categories.map((c) => c.id)
                    const allOn = ids.every(isEnabled)
                    const GroupIcon = GROUP_ICONS[group.id] ?? BellIcon
                    const open = Boolean(query) || expanded.has(group.id)
                    return (
                      <div key={group.id} className="overflow-hidden rounded-lg border border-border-card">
                        <div className="flex items-center gap-3 p-3 transition-colors duration-200 hover:bg-tertiary-bg/60 has-focus-visible:bg-tertiary-bg/60 motion-reduce:transition-none">
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-controls={`notification-group-${group.id}`}
                            onClick={() => toggleExpanded(group.id)}
                            disabled={Boolean(query)}
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md text-left disabled:cursor-default"
                          >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-button-info/15 text-link">
                              <GroupIcon className="size-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium text-primary-text">{group.label}</span>
                              <span className="mt-0.5 block text-sm text-secondary-text">{group.description}</span>
                            </span>
                            <ChevronIcon
                              className={`size-4 shrink-0 text-secondary-text transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
                            />
                          </button>
                          <Switch
                            aria-label={`All ${group.label} notifications`}
                            checked={allOn}
                            disabled={ids.some((id) => pending.has(id))}
                            onCheckedChange={(checked) => void setCategories(ids, checked)}
                          />
                        </div>
                        <div
                          id={`notification-group-${group.id}`}
                          className={`grid transition-[grid-template-rows,visibility] duration-200 ease-out motion-reduce:transition-none ${open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'}`}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <div className="border-t border-border-card px-3 py-1">
                              {group.categories.map((category) => (
                                <label
                                  key={category.id}
                                  className="-mx-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg py-2 pr-3 pl-16 transition-colors duration-200 hover:bg-tertiary-bg/60 motion-reduce:transition-none"
                                >
                                  <div className="min-w-0">
                                    <span className="block text-sm font-medium text-primary-text">{category.label}</span>
                                    <p className="mt-0.5 text-sm text-secondary-text">{category.description}</p>
                                  </div>
                                  <Switch
                                    checked={isEnabled(category.id)}
                                    disabled={pending.has(category.id)}
                                    onCheckedChange={(checked) => void setCategories([category.id], checked)}
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      </SettingsCard>
    </SettingsPageLayout>
  )
}
