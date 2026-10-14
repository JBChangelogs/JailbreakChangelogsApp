import { useTheme } from '@renderer/contexts/ThemeContext'
import { usePreferences } from '@renderer/contexts/PreferencesContext'
import { Switch } from '@renderer/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { ThemeIcon } from '@renderer/components/ui/theme-icon'
import { themeColor, type SiteTheme } from '@renderer/lib/themes'

/**
 * The theme's colors: dots for its main colors on its page background, each named in a
 * tooltip. Hidden from screen readers; the label names the theme.
 */
function ThemePreview({ theme }: { theme: SiteTheme }): React.JSX.Element {
  const page = themeColor(theme, '--color-primary-bg')
  const text = themeColor(theme, '--color-primary-text')
  const dots = [
    ['Cards', themeColor(theme, '--color-secondary-bg')],
    ['Secondary text', themeColor(theme, '--color-secondary-text')],
    ['Text', text],
    ['Buttons', themeColor(theme, '--color-button-info')],
    ['Links', themeColor(theme, '--color-link')]
  ]
  return (
    <span aria-hidden="true" className="flex h-16 items-center justify-center" style={{ background: page }}>
      <span className="flex -space-x-1.5">
        {dots.map(([use, color]) => (
          <Tooltip key={use}>
            <TooltipTrigger asChild>
              <span
                className="size-6 rounded-full border-2"
                style={{
                  background: color,
                  borderColor: page,
                  // Outlined so colors close to the background still show.
                  outline: `1px solid color-mix(in srgb, ${text} 25%, transparent)`
                }}
              />
            </TooltipTrigger>
            <TooltipContent>{use}</TooltipContent>
          </Tooltip>
        ))}
      </span>
    </span>
  )
}

function SettingRow({
  label,
  description,
  checked,
  onCheckedChange
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-quaternary-bg">
      <div className="min-w-0">
        <span className="text-sm text-primary-text">{label}</span>
        <p className="mt-0.5 text-xs text-tertiary-text">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}

/** Theme picker with previews, plus the other display settings the website has. */
export function DisplaySettingsSection(): React.JSX.Element {
  const {
    applied,
    themes,
    setTheme,
    cursorEnabled,
    setCursorEnabled,
    shortcutHidden,
    setShortcutHidden
  } = useTheme()
  const { twemojiEnabled, setTwemojiEnabled } = usePreferences()

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <h1 className="text-xl font-bold text-primary-text">Display</h1>
      <p className="mt-1 text-sm text-tertiary-text">
        Choose how the app looks. Your theme syncs with the website.
      </p>

      <div role="radiogroup" aria-label="Theme" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {themes.map((theme) => (
          <label
            key={theme.slug}
            className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border-card transition-[border-color,box-shadow] hover:border-border-focus/60 has-checked:border-button-info has-checked:ring-2 has-checked:ring-button-info/30 has-focus-visible:ring-2 has-focus-visible:ring-border-focus"
          >
            <input
              type="radio"
              name="theme"
              value={theme.slug}
              checked={applied.slug === theme.slug}
              onChange={() => setTheme(theme.slug)}
              className="sr-only"
            />
            <ThemePreview theme={theme} />
            <span className="flex min-h-11 flex-1 items-center gap-2 border-t border-border-card px-3 py-2 group-has-checked:bg-button-info/10">
              <ThemeIcon icon={theme.icon} className="size-4 text-secondary-text" />
              <span className="text-sm leading-tight font-medium text-primary-text">{theme.label}</span>
              <span
                aria-hidden="true"
                className="ml-auto size-3.5 shrink-0 rounded-full border-2 border-border-card transition-colors group-has-checked:border-button-info group-has-checked:bg-button-info group-has-checked:shadow-[inset_0_0_0_2px_var(--color-secondary-bg)]"
              />
            </span>
          </label>
        ))}
      </div>

      <div className="mt-6 space-y-0.5">
        <SettingRow
          label="Use theme cursor"
          description="Match your cursor to your selected theme. Saved on this computer."
          checked={cursorEnabled}
          onCheckedChange={setCursorEnabled}
        />
        <SettingRow
          label="Theme button in title bar"
          description="Show a button in the title bar for switching themes. Saved on this computer."
          checked={!shortcutHidden}
          onCheckedChange={(show) => setShortcutHidden(!show)}
        />
        <SettingRow
          label="Use Twemoji"
          description="Render emoji with Twitter's emoji set instead of your system's."
          checked={twemojiEnabled}
          onCheckedChange={setTwemojiEnabled}
        />
      </div>
    </div>
  )
}
