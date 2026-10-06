import type { BountyData } from '@shared/bounty'

const INVENTORY_API_URL = 'https://inventories.jailbreakchangelogs.com'

function getAvatarUrl(userId: number): string {
  return `${INVENTORY_API_URL}/proxy/users/${userId}/avatar-headshot`
}

function DollarIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m3-9.75c0-1.036-1.343-1.875-3-1.875s-3 .84-3 1.875.343.375 3 1.875 3 .84 3 1.875-1.343 1.875-3 1.875-3-.84-3-1.875"
      />
    </svg>
  )
}

function CubeIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
      />
    </svg>
  )
}

export function BountyCard({ bounty }: { bounty: BountyData }): React.JSX.Element {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border-card bg-secondary-bg transition-shadow hover:shadow-md">
      <div className="bg-tertiary-bg p-3">
        <div className="mb-2 flex items-center gap-2.5">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border-card">
            <img
              src={getAvatarUrl(bounty.userid)}
              alt={bounty.display_name}
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
          <a
            href={`https://www.roblox.com/users/${bounty.userid}/profile`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-sm font-semibold text-primary-text hover:text-link"
          >
            {bounty.display_name}
          </a>
        </div>

        <div className="flex items-center gap-1.5">
          <DollarIcon className="h-5 w-5 text-status-warning" />
          <span className="text-xl font-bold text-status-warning">{bounty.bounty.toLocaleString()}</span>
        </div>
      </div>

      {bounty.inventory.length > 0 && (
        <div className="p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-secondary-text">
            <CubeIcon className="h-3.5 w-3.5" />
            Inventory ({bounty.inventory.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bounty.inventory.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="inline-flex items-center rounded-md border border-border-card bg-tertiary-bg/40 px-2 py-1 text-[11px] font-medium text-primary-text"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
