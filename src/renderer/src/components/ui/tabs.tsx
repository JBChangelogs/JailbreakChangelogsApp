import { useLayoutEffect, useRef, useState } from 'react'
import { usePreferences } from '@renderer/contexts/PreferencesContext'
import { cn } from '@renderer/lib/utils'

export function Tabs<T extends string>({
  value,
  onChange,
  options,
  fill = true,
  className
}: {
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: React.ReactNode }[]
  fill?: boolean
  className?: string
}): React.JSX.Element {
  const { tabStyle } = usePreferences()
  const filled = tabStyle === 'filled'
  const listRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = (): void => {
      const active = list.querySelector<HTMLElement>('[aria-selected="true"]')
      setIndicator(active ? { left: active.offsetLeft, width: active.offsetWidth } : null)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [value, filled, options.length])

  return (
    <div
      ref={listRef}
      role="tablist"
      className={cn(
        'relative flex h-10 shrink-0 items-stretch',
        filled ? 'gap-1 rounded-xl border border-border-card bg-secondary-bg p-1' : 'border-b border-border-primary',
        !fill && 'w-max',
        className
      )}
    >
      {indicator && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute transition-[left,width] duration-200 ease-out',
            filled ? 'inset-y-1 rounded-lg bg-tab-active' : '-bottom-px h-0.5 rounded-full bg-button-info'
          )}
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative px-3 text-sm font-medium whitespace-nowrap transition-colors',
              fill && 'flex-1',
              filled && 'rounded-lg',
              active
                ? filled
                  ? 'text-form-button-text'
                  : 'text-primary-text'
                : 'text-secondary-text hover:text-primary-text'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
