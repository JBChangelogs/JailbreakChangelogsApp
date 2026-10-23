import { Fragment } from 'react'
import { Switch } from '@renderer/components/ui/switch'
import type { SettingsCategories } from '@shared/settings'
import { SETTINGS_LIST, SettingRow, SettingsCard, formatSettingName } from '@renderer/components/settings/SettingsCard'
import { PaletteIcon, ShieldIcon, UserIcon } from '@renderer/components/settings/SettingsSidebar'

const CATEGORY_ICONS: Record<string, (props: { className?: string }) => React.JSX.Element> = {
  privacy: ShieldIcon,
  appearance: PaletteIcon
}

interface CategorySettingsListProps {
  settings: SettingsCategories | null
  loading: boolean
  error: string | null
  pending: Set<string>
  toggle: (name: string, next: boolean) => void
  categoryFilter: (categoryName: string) => boolean
  excludeSettings?: Set<string>
  renderBefore?: (settingName: string) => React.ReactNode
  renderAction?: (settingName: string) => React.ReactNode
  renderEnd?: (categoryName: string, settingNames: string[]) => React.ReactNode
}

export function CategorySettingsList({
  settings,
  loading,
  error,
  pending,
  toggle,
  categoryFilter,
  excludeSettings,
  renderBefore,
  renderAction,
  renderEnd
}: CategorySettingsListProps): React.JSX.Element {
  const categories = settings
    ? Object.values(settings)
        .filter((category) => categoryFilter(category.name))
        .map((category) => ({
          ...category,
          settings: category.settings.filter((s) => !excludeSettings?.has(s.name))
        }))
        .filter((category) => category.settings.length > 0)
        .sort((a, b) => a.index - b.index)
    : []

  return (
    <>
      {loading && <p className="text-sm text-quaternary-text">Loading…</p>}
      {error && <p className="text-sm text-form-error">{error}</p>}
      {!loading &&
        !error &&
        categories.map((category) => {
          const title = category.name.charAt(0).toUpperCase() + category.name.slice(1)
          const showDescription =
            category.description && category.description.trim().toLowerCase() !== `${category.name} settings`
          return (
            <SettingsCard
              key={category.name}
              title={title}
              icon={CATEGORY_ICONS[category.name.toLowerCase()] ?? UserIcon}
              description={showDescription ? <p>{category.description}</p> : undefined}
            >
              <div className={SETTINGS_LIST}>
                {[...category.settings]
                  .sort((a, b) => a.index - b.index)
                  .map((setting) => {
                    const customAction = renderAction?.(setting.name)
                    return (
                      <Fragment key={setting.name}>
                        {renderBefore?.(setting.name)}
                        <SettingRow
                          highlight={!customAction}
                          title={formatSettingName(setting.name)}
                          description={setting.description}
                          action={
                            customAction ?? (
                              <Switch
                                checked={setting.value}
                                disabled={pending.has(setting.name)}
                                onCheckedChange={(checked) => toggle(setting.name, checked)}
                              />
                            )
                          }
                        />
                      </Fragment>
                    )
                  })}
                {renderEnd?.(
                  category.name,
                  category.settings.map((s) => s.name)
                )}
              </div>
            </SettingsCard>
          )
        })}
    </>
  )
}
