import { TAB_INFO } from '@renderer/components/NavBar'
import { SETTINGS_LIST, SettingRow, SettingsCard, SettingsPageLayout } from '@renderer/components/settings/SettingsCard'
import { AppWindowIcon } from '@renderer/components/settings/SettingsSidebar'
import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { ChoiceSetting } from '@renderer/components/settings/sections/DisplaySettingsSection'
import {
  TAB_TYPES,
  useNavigationMode,
  useTabPreferences,
  type RestoreTabsMode,
  type TabType
} from '@renderer/contexts/TabsContext'
import type { NavigationMode } from '@renderer/lib/localPreferences'

const NAVIGATION_OPTIONS: readonly { value: NavigationMode; label: string; description: string }[] = [
  { value: 'tabs', label: 'Tabs', description: 'Open pages as tabs in the title bar, as many as you need.' },
  { value: 'simple', label: 'Simple', description: 'Switch pages from the icons above the sidebar.' }
]

function NavigationPreview({ mode }: { mode: NavigationMode }): React.JSX.Element {
  return (
    <div aria-hidden className="overflow-hidden rounded-lg border border-border-card bg-primary-bg">
      <div className="flex h-8 items-center gap-1.5 border-b border-border-card bg-secondary-bg px-2.5">
        <div className="size-3.5 shrink-0 rounded-full bg-secondary-text/30" />
        {mode === 'tabs' && (
          <>
            <div className="ml-2 h-5 w-16 rounded bg-quaternary-bg" />
            <div className="h-5 w-14 rounded bg-secondary-text/10" />
            <div className="h-5 w-14 rounded bg-secondary-text/10" />
            <div className="h-3 w-3 rounded-sm bg-secondary-text/25" />
          </>
        )}
      </div>
      <div className="flex h-24">
        <div className="w-1/3 space-y-2 border-r border-border-card bg-secondary-bg p-2">
          {mode === 'simple' && (
            <div className="flex justify-between border-b border-border-card pb-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`size-4 rounded ${i === 0 ? 'bg-button-info' : 'bg-secondary-text/20'}`} />
              ))}
            </div>
          )}
          <div className="h-2 w-3/4 rounded-full bg-secondary-text/20" />
          <div className="h-2 w-1/2 rounded-full bg-secondary-text/15" />
        </div>
        <div className="flex-1 space-y-2 p-3">
          <div className="h-2 w-1/3 rounded-full bg-secondary-text/25" />
          <div className="h-2 w-2/3 rounded-full bg-secondary-text/15" />
          <div className="h-10 rounded-md bg-secondary-text/10" />
        </div>
      </div>
    </div>
  )
}

const RESTORE_OPTIONS: readonly { value: RestoreTabsMode; label: string }[] = [
  { value: 'ask', label: 'Ask' },
  { value: 'auto', label: 'Always' },
  { value: 'off', label: 'Never' }
]

const TAB_OPTIONS = TAB_TYPES.map((type) => ({ value: type, label: TAB_INFO[type].title }))

function ChevronIcon(): React.JSX.Element {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  )
}

function SelectMenu<T extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="secondary" aria-label={label} className="min-w-44 justify-between gap-2">
          {options.find((option) => option.value === value)?.label}
          <ChevronIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(next as T)}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppSettingsSection(): React.JSX.Element {
  const { newTabType, startTabType, restoreMode, setNewTabType, setStartTabType, setRestoreMode } = useTabPreferences()
  const { mode: navigationMode, setMode: setNavigationMode } = useNavigationMode()

  return (
    <SettingsPageLayout>
      <SettingsCard title="Navigation & tabs" icon={AppWindowIcon}>
        <div className={SETTINGS_LIST}>
          <ChoiceSetting
            id="navigation"
            title="Navigation"
            description="Choose how you move between pages. Saved on this computer."
            options={NAVIGATION_OPTIONS}
            value={navigationMode}
            onChange={setNavigationMode}
            preview={<NavigationPreview mode={navigationMode} />}
          />
          <SettingRow
            title="Starting tab"
            description="The tab the app opens on. Saved on this computer."
            action={
              <SelectMenu<TabType>
                label="Starting tab"
                options={TAB_OPTIONS}
                value={startTabType}
                onChange={setStartTabType}
              />
            }
          />
          <SettingRow
            title="New tab shortcut"
            description={`The tab ${window.api.platform === 'darwin' ? 'Cmd' : 'Ctrl'}+T opens. Saved on this computer.`}
            action={
              <SelectMenu<TabType>
                label="New tab shortcut"
                options={TAB_OPTIONS}
                value={newTabType}
                onChange={setNewTabType}
              />
            }
          />
          <SettingRow
            title="Restore tabs"
            description="Whether to reopen the tabs you had open last time. Saved on this computer."
            action={
              <SelectMenu<RestoreTabsMode>
                label="Restore tabs"
                options={RESTORE_OPTIONS}
                value={restoreMode}
                onChange={setRestoreMode}
              />
            }
          />
        </div>
      </SettingsCard>
    </SettingsPageLayout>
  )
}
