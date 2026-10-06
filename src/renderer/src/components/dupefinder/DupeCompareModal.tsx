import { currentOwnerId, useDupeFinder } from '@renderer/contexts/DupeFinderContext'
import { RobloxAvatar } from '@renderer/components/dupefinder/RobloxAvatar'
import { DupeHistoryList } from '@renderer/components/dupefinder/DupeHistoryList'
import { getItemImagePath, handleImageError } from '@renderer/lib/itemValueUtils'
import { userDisplay, userHandle } from '@renderer/lib/dupeDisplay'
import type { DupeFinderItem, RobloxUserSummary } from '@shared/dupe'

function XIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function formatDate(timestamp: number): string {
  const ms = timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function VariantColumn({
  label,
  item,
  itemsMap,
  ownerProfiles
}: {
  label: string
  item: DupeFinderItem
  itemsMap: ReturnType<typeof useDupeFinder>['itemsMap']
  ownerProfiles: Record<string, RobloxUserSummary>
}): React.JSX.Element {
  const ownerId = currentOwnerId(item, '')
  const owner = ownerProfiles[ownerId]
  const itemData = itemsMap.get(item.item_id)

  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-border-card bg-secondary-bg p-4">
      <h3 className="mb-3 text-center text-base font-bold text-primary-text">{label}</h3>

      {itemData && (
        <div className="mb-3 aspect-video w-full overflow-hidden rounded-2xl bg-tertiary-bg">
          <img
            src={getItemImagePath(item.categoryTitle, item.title)}
            alt={item.title}
            onError={handleImageError}
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      )}

      <div className="flex flex-col items-center gap-2 border-t border-border-card pt-3 text-center">
        <p className="text-[10px] font-bold uppercase tracking-wide text-secondary-text">Current Owner</p>
        <a
          href={ownerId ? `https://www.roblox.com/users/${ownerId}/profile` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2"
        >
          <RobloxAvatar userId={ownerId} label={userDisplay(owner, ownerId)} className="h-10 w-10" />
          <span className="text-left">
            <span className="block text-sm font-bold text-link">{userDisplay(owner, ownerId)}</span>
            <span className="block text-xs text-secondary-text">@{userHandle(owner, ownerId)}</span>
          </span>
        </a>
      </div>

      <p className="mt-3 border-t border-border-card pt-3 text-center text-[10px] text-secondary-text uppercase">Logged On</p>
      <p className="text-center text-sm font-bold text-primary-text">{formatDate(item.logged_at)}</p>

      <div className="mt-3 border-t border-border-card pt-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-secondary-text">
          Ownership History ({item.history?.length ?? 0})
        </p>
        <DupeHistoryList history={item.history ?? []} ownerProfiles={ownerProfiles} />
      </div>
    </div>
  )
}

export function DupeCompareModal(): React.JSX.Element | null {
  const { compareState, closeCompare, itemsMap, ownerProfiles } = useDupeFinder()
  if (compareState.status === 'closed') return null

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60 p-6" onClick={closeCompare}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border-card bg-primary-bg shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border-primary px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-text">Duplicate Comparison</h2>
          <button
            type="button"
            onClick={closeCompare}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {compareState.status === 'loading' && (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
            </div>
          )}
          {compareState.status === 'error' && (
            <p className="py-10 text-center text-sm text-status-error">{compareState.message}</p>
          )}
          {compareState.status === 'ready' && (
            <div className="flex flex-col gap-4 sm:flex-row">
              <VariantColumn label="Original" item={compareState.og} itemsMap={itemsMap} ownerProfiles={ownerProfiles} />
              <VariantColumn label="Duplicate" item={compareState.duplicate} itemsMap={itemsMap} ownerProfiles={ownerProfiles} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
