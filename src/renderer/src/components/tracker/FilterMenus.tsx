import { forwardRef } from 'react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { getCountryName } from '@renderer/lib/countryNames'

function ChevronDownIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  )
}

export const DropdownTriggerButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; value: string }
>(({ label, value, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className="flex h-10 w-full items-center justify-between gap-1.5 rounded-xl border border-border-card bg-secondary-bg px-3.5 text-left text-sm font-medium text-primary-text transition-colors hover:border-border-focus focus:border-button-info focus:outline-none"
    {...props}
  >
    <span className="min-w-0 truncate">
      <span className="text-secondary-text">{label}: </span>
      {value}
    </span>
    <ChevronDownIcon className="h-4 w-4 shrink-0 text-secondary-text" />
  </button>
))
DropdownTriggerButton.displayName = 'DropdownTriggerButton'

export function FilterMenu<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}): React.JSX.Element {
  const current = options.find((o) => o.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <DropdownTriggerButton label={label} value={current?.label ?? ''} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
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

export function CountryFilterMenu({
  countries,
  selected,
  onToggle,
  onClear
}: {
  countries: [string, number][]
  selected: Set<string>
  onToggle: (code: string) => void
  onClear: () => void
}): React.JSX.Element {
  const summary =
    selected.size === 0
      ? 'All Countries'
      : selected.size === 1
        ? getCountryName([...selected][0])
        : `${selected.size} selected`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <DropdownTriggerButton label="Country" value={summary} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {selected.size > 0 && (
          <>
            <button
              type="button"
              onClick={onClear}
              className="w-full px-2.5 py-1.5 text-left text-sm font-semibold text-link hover:text-link-hover"
            >
              Clear selection
            </button>
            <DropdownMenuSeparator />
          </>
        )}
        {countries.map(([countryCode, count]) => (
          <DropdownMenuCheckboxItem
            key={countryCode}
            checked={selected.has(countryCode)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => onToggle(countryCode)}
          >
            <span className="flex w-full items-center justify-between gap-3">
              {getCountryName(countryCode)}
              <span className="text-tertiary-text">{count.toLocaleString()}</span>
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
