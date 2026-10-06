import { SORT_OPTIONS, useDupeFinder, type SortOrder } from '@renderer/contexts/DupeFinderContext'
import { RobloxAvatar } from '@renderer/components/dupefinder/RobloxAvatar'
import { DupeSearchBar } from '@renderer/components/dupefinder/DupeSearchBar'
import { DupeHistoryList } from '@renderer/components/dupefinder/DupeHistoryList'
import { SearchInput } from '@renderer/components/ui/search-input'
import { FilterMenu } from '@renderer/components/tracker/FilterMenus'
import { formatUsdCompact, userDisplay, userHandle, VerifiedIcon } from '@renderer/lib/dupeDisplay'

function BackIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19 8 12l7-7" />
    </svg>
  )
}

function HistoryIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z" />
    </svg>
  )
}

export function DupeFinderSidebar(): React.JSX.Element {
  const {
    state,
    search,
    searchTerm,
    setSearchTerm,
    selectedCategories,
    toggleCategory,
    sortOrder,
    setSortOrder,
    categories,
    selectedItem,
    selectItem,
    ownerProfiles,
    openCompare,
    mergedDupeCount,
    totalDupedValue
  } = useDupeFinder()

  if (selectedItem) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border-primary px-3 py-2.5">
          <button
            type="button"
            onClick={() => selectItem(null)}
            aria-label="Back"
            className="flex h-7 w-7 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
          >
            <BackIcon className="h-4 w-4" />
          </button>
          <h1 className="truncate text-xs font-bold uppercase tracking-wide text-quaternary-text">{selectedItem.title}</h1>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <button
            type="button"
            onClick={() => openCompare(selectedItem.id)}
            className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-button-info px-3 py-1.5 text-xs font-semibold text-form-button-text transition-colors hover:bg-button-info-hover"
          >
            Compare Variants
          </button>

          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-quaternary-text">
            <HistoryIcon className="h-3 w-3" />
            Ownership History ({selectedItem.history?.length ?? 0})
          </div>

          <DupeHistoryList history={selectedItem.history ?? []} ownerProfiles={ownerProfiles} />
        </div>
      </div>
    )
  }

  const identity =
    state.status === 'success' || state.status === 'no-dupes' ? { robloxId: state.robloxId, user: state.user } : null

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-border-primary px-3 py-2.5">
        <h1 className="text-xs font-bold uppercase tracking-wide text-quaternary-text">Dupe Finder</h1>
        <DupeSearchBar onSearch={search} loading={state.status === 'loading'} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {identity ? (
          <div className="rounded-2xl border border-border-card bg-tertiary-bg p-3">
            <div className="flex items-center gap-3">
              <RobloxAvatar
                userId={identity.robloxId}
                label={userDisplay(identity.user, identity.robloxId)}
                className="h-12 w-12 border border-border-card"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-sm font-bold text-primary-text">
                  {userDisplay(identity.user, identity.robloxId)}
                  {identity.user?.hasVerifiedBadge && <VerifiedIcon className="h-3.5 w-3.5 shrink-0 text-button-info" />}
                </p>
                <p className="truncate text-xs text-secondary-text">@{userHandle(identity.user, identity.robloxId)}</p>
              </div>
            </div>
            <a
              href={`https://www.roblox.com/users/${identity.robloxId}/profile`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-link hover:underline"
            >
              Roblox profile
            </a>

            {state.status === 'success' && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border-card pt-3">
                <div className="min-w-0">
                  <p className="text-[10px] text-secondary-text">Dupe Items</p>
                  <p className="truncate text-base font-bold text-primary-text">{mergedDupeCount.toLocaleString()}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-secondary-text">Duped Value</p>
                  <p className="truncate text-base font-bold text-primary-text">{formatUsdCompact(totalDupedValue)}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 text-xs text-secondary-text">
            <p>Search a Roblox ID or username to check for any duped items associated with that account.</p>
            <ul className="list-disc space-y-1.5 pl-4">
              <li>Click a result card to see that item&apos;s ownership history.</li>
              <li>From there, compare it against its original variant to help spot a false-positive dupe flag.</li>
            </ul>
          </div>
        )}

        {state.status === 'success' && (
          <div className="mt-3 space-y-2">
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search duped items..." />
            <FilterMenu<SortOrder> label="Sort" value={sortOrder} options={SORT_OPTIONS} onChange={setSortOrder} />
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      selectedCategories.has(category)
                        ? 'border-button-info/40 bg-button-info/20 text-primary-text'
                        : 'border-border-card bg-tertiary-bg text-secondary-text hover:bg-quaternary-bg'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
