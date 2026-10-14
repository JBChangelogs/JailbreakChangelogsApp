export function Kbd({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <kbd className="rounded-md border border-border-card bg-tertiary-bg px-1.5 py-0.5 font-sans text-[10px] font-semibold text-primary-text">
      {children}
    </kbd>
  )
}
