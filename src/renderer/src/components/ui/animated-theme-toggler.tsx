import { useState } from 'react'
import { cn } from '@renderer/lib/utils'
import { useTheme } from '@renderer/contexts/ThemeContext'
import { useSettingsPage } from '@renderer/contexts/SettingsPageContext'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { ThemeIcon } from '@renderer/components/ui/theme-icon'

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<'button'> {
  size?: 'sm' | 'md'
  /** Whether Display settings can open; it needs a signed-in account with app access. */
  canOpenSettings?: boolean
}

const CheckIcon = ({ className }: { className?: string }): React.JSX.Element => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
    <path
      fill="currentColor"
      d="M229.66 77.66l-128 128a8 8 0 0 1-11.32 0l-56-56a8 8 0 0 1 11.32-11.32L96 188.69L218.34 66.34a8 8 0 0 1 11.32 11.32"
    />
  </svg>
)

/** The title bar's theme button: quick-switches between every theme. */
export const AnimatedThemeToggler = ({
  className,
  size = 'md',
  canOpenSettings = false,
  ...props
}: AnimatedThemeTogglerProps): React.JSX.Element | null => {
  const { applied, themes, setTheme, shortcutHidden } = useTheme()
  const { open: openSettings } = useSettingsPage()
  const [open, setOpen] = useState(false)
  if (shortcutHidden) return null

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'bg-secondary-bg text-secondary-text hover:bg-quaternary-bg hover:text-primary-text flex cursor-pointer items-center justify-center transition-all duration-200',
            size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
            className
          )}
          aria-label={`Change theme (current: ${applied.label})`}
          {...props}
        >
          <ThemeIcon icon={applied.icon} className={cn('text-primary-text', iconSize)} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-[2147483647] max-h-[70vh] w-52 overflow-y-auto p-1"
      >
        {themes.map(({ slug, label, icon }) => (
          <button
            key={slug}
            type="button"
            onClick={() => {
              setTheme(slug)
              setOpen(false)
            }}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              applied.slug === slug
                ? 'text-status-info'
                : 'text-secondary-text hover:bg-quaternary-bg hover:text-primary-text'
            )}
          >
            <ThemeIcon icon={icon} className="h-4 w-4" />
            <span className="flex-1 text-left">{label}</span>
            {applied.slug === slug && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
          </button>
        ))}
        {canOpenSettings && (
          <button
            type="button"
            onClick={() => {
              openSettings('display')
              setOpen(false)
            }}
            className="mt-1 flex w-full cursor-pointer items-center gap-2.5 rounded-md border-t border-border-primary px-3 py-2 text-sm text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
          >
            <ThemeIcon icon="lucide:settings" className="h-4 w-4" />
            <span className="flex-1 text-left">Display settings</span>
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
