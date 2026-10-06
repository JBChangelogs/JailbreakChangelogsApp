function SearchIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  disabled,
  className = ''
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}): React.JSX.Element {
  return (
    <div className={`relative ${className}`}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-secondary-text" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 w-full rounded-xl border border-border-card bg-secondary-bg py-2 pr-8 pl-9 text-sm text-primary-text placeholder-secondary-text transition-colors focus:border-button-info focus:outline-none disabled:opacity-60"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-secondary-text transition-colors hover:text-primary-text"
        >
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
