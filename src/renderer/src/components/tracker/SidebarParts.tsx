export function SidebarHeader({
  title,
  activeCount,
  onClearAll
}: {
  title: string
  activeCount: number
  onClearAll: () => void
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <h1 className="text-xs font-bold tracking-wide text-quaternary-text uppercase">
        {title}
        {activeCount > 0 && (
          <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-button-info px-1 text-[10px] text-form-button-text">
            {activeCount}
          </span>
        )}
      </h1>
      {activeCount > 0 && (
        <button type="button" onClick={onClearAll} className="text-[11px] font-semibold text-link hover:text-link-hover">
          Clear all
        </button>
      )}
    </div>
  )
}

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
    <div className="flex items-center justify-between gap-2 px-1 pb-1.5">
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
