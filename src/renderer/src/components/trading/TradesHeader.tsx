function BackIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19 8 12l7-7" />
    </svg>
  )
}

// Same height as the nav bar, so the border lines up across the sidebar and main pane.
export function TradesHeader({ title, onBack }: { title: string; onBack: () => void }): React.JSX.Element {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-border-primary py-2 pr-5 pl-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
      >
        <BackIcon className="h-4 w-4" />
      </button>
      <h2 className="text-sm font-semibold text-primary-text">{title}</h2>
    </div>
  )
}
