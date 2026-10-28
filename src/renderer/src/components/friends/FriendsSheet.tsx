import { useState } from 'react'
import { SearchInput } from '@renderer/components/ui/search-input'
import { Tabs } from '@renderer/components/ui/tabs'
import { UserAvatar } from '@renderer/components/messages/UserAvatar'
import { FriendButton } from '@renderer/components/user/FriendButton'
import { UserProfilePopover } from '@renderer/components/user/UserProfilePopover'
import { useFriends } from '@renderer/hooks/useFriends'
import { resolveAvatarUrl } from '@renderer/lib/usersApi'
import type { FriendUser } from '@renderer/lib/friendsApi'
import type { UserProfile } from '@shared/user'

type SheetTab = 'friends' | 'pending'

function XIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function asProfile(user: FriendUser): UserProfile {
  return {
    id: user.id,
    username: user.username,
    name: user.global_name || user.username,
    global_name: user.global_name ?? undefined,
    avatar: user.custom_avatar || resolveAvatarUrl(user.id, user.avatar),
    premiumtype: user.premiumtype
  } as UserProfile
}

function formatDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function FriendRow({ user, detail }: { user: FriendUser; detail: string | null }): React.JSX.Element {
  const profile = asProfile(user)
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-quaternary-bg/50">
      <UserProfilePopover userId={user.id} profile={profile}>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <UserAvatar id={user.id} profile={profile} className="h-9 w-9" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-primary-text">{profile.name}</span>
            <span className="block truncate text-xs text-tertiary-text">{detail ?? `@${user.username}`}</span>
          </span>
        </button>
      </UserProfilePopover>
      <FriendButton userId={user.id} />
    </div>
  )
}

function Section({ label, users, detail }: { label: string; users: FriendUser[]; detail: (u: FriendUser) => string | null }): React.JSX.Element | null {
  if (users.length === 0) return null
  return (
    <div>
      <p className="px-2 pt-3 pb-1 text-xs font-bold tracking-wide text-quaternary-text uppercase">
        {label} — {users.length}
      </p>
      {users.map((user) => (
        <FriendRow key={user.id} user={user} detail={detail(user)} />
      ))}
    </div>
  )
}

export function FriendsSheet({ onClose }: { onClose: () => void }): React.JSX.Element {
  const state = useFriends()
  const [tab, setTab] = useState<SheetTab>('friends')
  const [search, setSearch] = useState('')

  const friends = state ? [...state.friends.values()] : []
  const incoming = state ? [...state.incoming.values()] : []
  const outgoing = state ? [...state.outgoing.values()] : []
  const query = search.trim().toLowerCase()
  const shownFriends = friends
    .filter((f) => !query || f.username.toLowerCase().includes(query) || f.global_name?.toLowerCase().includes(query))
    .sort((a, b) => (a.global_name || a.username).localeCompare(b.global_name || b.username))

  return (
    <aside className="flex h-full w-80 flex-col border-l border-border-primary bg-secondary-bg shadow-2xl animate-in slide-in-from-right-4 fade-in-0 duration-150">
      <div className="flex h-[57px] shrink-0 items-center justify-between border-b border-border-primary px-4">
        <h2 className="text-sm font-semibold text-primary-text">Friends</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close friends"
          className="flex h-7 w-7 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 p-2">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'friends', label: `Friends (${friends.length})` },
            { value: 'pending', label: `Pending (${incoming.length + outgoing.length})` }
          ]}
        />
        {tab === 'friends' && <SearchInput value={search} onChange={setSearch} placeholder="Search friends..." />}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {!state ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
          </div>
        ) : tab === 'friends' ? (
          shownFriends.length === 0 ? (
            <p className="py-8 text-center text-xs text-quaternary-text">
              {friends.length === 0 ? 'No friends yet. Add people from their profile card.' : 'No friends match your search.'}
            </p>
          ) : (
            shownFriends.map((user) => (
              <FriendRow
                key={user.id}
                user={user}
                detail={user.friends_since ? `Friends since ${formatDate(user.friends_since)}` : null}
              />
            ))
          )
        ) : incoming.length + outgoing.length === 0 ? (
          <p className="py-8 text-center text-xs text-quaternary-text">No pending friend requests.</p>
        ) : (
          <>
            <Section label="Received" users={incoming} detail={(u) => (u.created_at ? `Sent ${formatDate(u.created_at)}` : null)} />
            <Section label="Sent" users={outgoing} detail={(u) => (u.created_at ? `Sent ${formatDate(u.created_at)}` : null)} />
          </>
        )}
      </div>
    </aside>
  )
}
