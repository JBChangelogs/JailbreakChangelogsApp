import type { RobberyPlayer } from '@shared/robbery'

function UsersIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    </svg>
  )
}

export function InlineTeamPlayers({
  players,
  className
}: {
  players: RobberyPlayer[]
  className?: string
}): React.JSX.Element | null {
  if (players.length === 0) return null

  let copsCount = 0
  let criminalsCount = 0
  for (const p of players) {
    if (p.team === 'Police') copsCount++
    else if (p.team === 'Criminal') criminalsCount++
  }

  return (
    <div className={`flex items-center gap-2 text-xs text-secondary-text ${className ?? ''}`}>
      <UsersIcon className="h-4 w-4 shrink-0" />
      <span className="font-medium tabular-nums text-primary-text">
        {criminalsCount} Criminal{criminalsCount === 1 ? '' : 's'}
      </span>
      <span className="text-tertiary-text">•</span>
      <span className="font-medium tabular-nums text-primary-text">
        {copsCount} Cop{copsCount === 1 ? '' : 's'}
      </span>
    </div>
  )
}
