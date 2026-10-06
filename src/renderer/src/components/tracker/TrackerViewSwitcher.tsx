export type TrackerView = 'robberies' | 'bounties'

export function TrackerViewSwitcher({
  value,
  onChange
}: {
  value: TrackerView
  onChange: (view: TrackerView) => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-border-card bg-secondary-bg p-1">
      {(['robberies', 'bounties'] as const).map((view) => (
        <button
          key={view}
          type="button"
          onClick={() => onChange(view)}
          className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-colors px-3 ${value === view
            ? 'bg-button-info text-form-button-text'
            : 'text-secondary-text hover:text-primary-text'
            }`}
        >
          {view === 'robberies' ? 'Robberies' : 'Bounties'}
        </button>
      ))}
    </div>
  )
}
