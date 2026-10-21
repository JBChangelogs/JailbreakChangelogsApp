import { cn } from '@renderer/lib/utils'
import { useTheme } from '@renderer/contexts/ThemeContext'
import { useSettingsPage } from '@renderer/contexts/SettingsPageContext'
import { ThemeIcon } from '@renderer/components/ui/theme-icon'

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<'button'> {
  size?: 'sm' | 'md'
  /** Whether Display settings can open; it needs a signed-in account with app access. */
  canOpenSettings?: boolean
}

/** The title bar's theme button: opens Display settings. */
export const AnimatedThemeToggler = ({
  className,
  size = 'md',
  canOpenSettings = false,
  ...props
}: AnimatedThemeTogglerProps): React.JSX.Element | null => {
  const { applied, customTheme, shortcutHidden } = useTheme()
  const label = customTheme?.label ?? applied.label
  const icon = customTheme ? (customTheme.icon ?? 'lucide:palette') : applied.icon
  const { open: openSettings } = useSettingsPage()
  if (shortcutHidden || !canOpenSettings) return null

  return (
    <button
      type="button"
      onClick={() => openSettings('display')}
      className={cn(
        'bg-secondary-bg text-secondary-text hover:bg-quaternary-bg hover:text-primary-text flex cursor-pointer items-center justify-center transition-all duration-200',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        className
      )}
      aria-label={`Change theme (current: ${label})`}
      title="Display settings"
      {...props}
    >
      <ThemeIcon
        icon={icon}
        className={cn('text-primary-text', size === 'sm' ? 'h-4 w-4' : 'h-5 w-5')}
      />
    </button>
  )
}
