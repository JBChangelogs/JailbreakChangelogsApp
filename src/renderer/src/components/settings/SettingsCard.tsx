import { cn } from '@renderer/lib/utils'

export const SETTINGS_LIST = 'space-y-6'

export const SETTING_HIGHLIGHT =
  'relative isolate before:absolute before:-inset-x-3 before:-inset-y-2 before:-z-10 before:rounded-lg before:transition-colors before:duration-200 motion-reduce:before:transition-none hover:before:bg-tertiary-bg/60 has-focus-visible:before:bg-tertiary-bg/60'

export function SettingsPageLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="mx-auto max-w-3xl space-y-6 px-8 py-6">{children}</div>
}

export function SettingsCard({
  title,
  icon: Icon,
  description,
  variant = 'default',
  children
}: {
  title: string
  icon: (props: { className?: string }) => React.JSX.Element
  description?: React.ReactNode
  variant?: 'default' | 'danger'
  children: React.ReactNode
}): React.JSX.Element {
  const danger = variant === 'danger'
  return (
    <section
      className={cn(
        'rounded-xl border border-border-card bg-secondary-bg p-6 text-primary-text shadow-md',
        danger && 'relative overflow-hidden border-t-0'
      )}
    >
      {danger && <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-button-danger" />}
      <h2 className={cn('flex items-center gap-1.5 text-xl font-bold', danger ? 'text-button-danger' : 'text-primary-text')}>
        <Icon className="h-6 w-6" />
        {title}
      </h2>
      {description && <div className="mt-1 space-y-1 text-sm text-secondary-text">{description}</div>}
      <div className={cn('my-3 border-t', danger ? 'border-button-danger/30' : 'border-border-card')} />
      {children}
    </section>
  )
}

export function SettingRow({
  title,
  description,
  action,
  highlight = false,
  children
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  highlight?: boolean
  children?: React.ReactNode
}): React.JSX.Element {
  const Row = highlight ? 'label' : 'div'
  return (
    <div className={cn(highlight && SETTING_HIGHLIGHT)}>
      <Row className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-3', highlight && 'cursor-pointer')}>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-primary-text">{title}</h3>
          {description && <p className="mt-1 text-sm text-secondary-text">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </Row>
      {children}
    </div>
  )
}

export function SettingsSubsectionHeading({ title }: { title: string }): React.JSX.Element {
  return <h3 className="mb-1 text-lg font-semibold text-primary-text">{title}</h3>
}

export function formatSettingName(name: string): string {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
