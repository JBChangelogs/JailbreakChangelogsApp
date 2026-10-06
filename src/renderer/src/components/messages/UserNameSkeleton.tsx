export function UserNameSkeleton({ className = 'w-20' }: { className?: string }): React.JSX.Element {
  return <span className={`inline-block h-[0.85em] animate-pulse rounded bg-quaternary-bg align-middle ${className}`} />
}
