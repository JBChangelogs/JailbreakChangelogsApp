import { Switch } from '@renderer/components/ui/switch'
import type { SettingsCategories } from '@shared/settings'

// Server settings the app doesn't support yet.
const HIDDEN_SETTINGS = new Set(['custom_background'])

interface CategorySettingsListProps {
  settings: SettingsCategories | null
  loading: boolean
  error: string | null
  pending: Set<string>
  toggle: (name: string, next: boolean) => void
  categoryFilter: (categoryName: string) => boolean
  excludeSettings?: Set<string>
}

export function CategorySettingsList({
  settings,
  loading,
  error,
  pending,
  toggle,
  categoryFilter,
  excludeSettings
}: CategorySettingsListProps): React.JSX.Element {
  const categories = settings
    ? Object.values(settings)
        .filter((category) => categoryFilter(category.name))
        .map((category) => ({
          ...category,
          settings: category.settings.filter((s) => !HIDDEN_SETTINGS.has(s.name) && !excludeSettings?.has(s.name))
        }))
        .filter((category) => category.settings.length > 0)
        .sort((a, b) => a.index - b.index)
    : []

  return (
    <>
      {loading && <p className="mt-6 text-sm text-quaternary-text">Loading…</p>}
      {error && <p className="mt-6 text-sm text-form-error">{error}</p>}
      {!loading &&
        !error &&
        categories.map((category) => (
          <div key={category.name} className="mt-6 first:mt-5">
            <h2 className="text-xs font-bold tracking-wide text-quaternary-text uppercase">
              {category.name}
            </h2>
            {category.description && (
              <p className="mt-0.5 text-xs text-tertiary-text">{category.description}</p>
            )}
            <div className="mt-3 space-y-0.5">
              {[...category.settings]
                .sort((a, b) => a.index - b.index)
                .map((setting) => (
                  <label
                    key={setting.name}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-quaternary-bg"
                  >
                    <span className="text-sm text-primary-text">{setting.description}</span>
                    <Switch
                      checked={setting.value}
                      disabled={pending.has(setting.name)}
                      onCheckedChange={(checked) => toggle(setting.name, checked)}
                    />
                  </label>
                ))}
            </div>
          </div>
        ))}
    </>
  )
}
