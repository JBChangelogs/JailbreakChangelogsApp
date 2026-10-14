import { cn } from '@renderer/lib/utils'
import { iconUrl } from '@renderer/lib/themes'

/** A theme's Iconify icon, drawn in the text color. */
export function ThemeIcon({ icon, className }: { icon: string; className?: string }): React.JSX.Element {
  const mask = `url("${iconUrl(icon)}") center / contain no-repeat`
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block shrink-0 bg-current', className)}
      style={{ mask, WebkitMask: mask }}
    />
  )
}
