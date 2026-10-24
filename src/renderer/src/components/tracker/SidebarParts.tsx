export function SectionHeader({
  label,
  hint,
  onClear
}: {
  label: string
  hint?: React.ReactNode
  onClear?: () => void
}): React.JSX.Element {
  return (
    <div className="mb-1.5 flex h-4 items-center justify-between gap-2 px-1">
      <span className="text-[10px] font-bold tracking-wide text-quaternary-text uppercase">{label}</span>
      <span className="flex items-center gap-2">
        {hint && <span className="text-[10px] text-tertiary-text">{hint}</span>}
        {onClear && (
          <button type="button" onClick={onClear} className="text-[10px] font-semibold text-link hover:text-link-hover">
            Clear
          </button>
        )}
      </span>
    </div>
  )
}
