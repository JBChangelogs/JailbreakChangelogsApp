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
import { NOTIFICATION_PREFERENCE_GROUPS } from '@shared/notification'

function ChevronIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
    </svg>
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
    <div className="mx-auto max-w-2xl px-8 py-6">
      <h1 className="text-xl font-bold text-primary-text">Notifications</h1>
      <p className="mt-1 text-sm text-tertiary-text">
        Controls how the app notifies you
      </p>

      <h2 className="mt-6 text-xs font-bold tracking-wide text-quaternary-text uppercase">Delivery</h2>
      <div className="mt-3 space-y-0.5">
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

      <h2 className="mt-8 text-xs font-bold tracking-wide text-quaternary-text uppercase">
        What to notify you about
      </h2>
      <p className="mt-0.5 text-xs text-tertiary-text">
        Turn a whole group on or off, or open it to choose individual notifications. Synced to your account.
      </p>
      {loading && <p className="mt-3 text-sm text-quaternary-text">Loading…</p>}
      {error && <p className="mt-3 text-sm text-form-error">{error}</p>}
      {!loading && (
        <>
          <SearchInput value={search} onChange={setSearch} placeholder="Search notifications..." className="mt-3" />
          <div className="mt-3 space-y-2">
            {groups.length === 0 && (
              <p className="py-4 text-center text-sm text-quaternary-text">No notifications match your search.</p>
            )}
            {groups.map((group) => {
              const ids = group.categories.map((c) => c.id)
              const onCount = ids.filter(isEnabled).length
              const allOn = onCount === ids.length
              const open = Boolean(query) || expanded.has(group.id)
              return (
                <div key={group.id} className="rounded-xl border border-border-card bg-secondary-bg">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`notification-group-${group.id}`}
                      onClick={() => toggleExpanded(group.id)}
                      disabled={Boolean(query)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left disabled:cursor-default"
                    >
                      <ChevronIcon
                        className={`h-4 w-4 shrink-0 text-secondary-text transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}
                      />
                      <span className="text-sm font-medium text-primary-text">{group.label}</span>
                      <span className="text-xs text-tertiary-text">
                        {onCount} of {ids.length} on
                      </span>
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
                      <div className="space-y-0.5 border-t border-border-card p-1.5">
                        {group.categories.map((category) => (
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
    </div>
  )
}
