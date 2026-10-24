import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Checkbox } from '@renderer/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useAuth } from '@renderer/contexts/AuthContext'
import { groupTypingKey, useRealtime } from '@renderer/contexts/RealtimeContext'
import { useUserProfiles } from '@renderer/hooks/useUserProfiles'
import { groupChatsApi, type GroupChat } from '@renderer/lib/messagesApi'
import { UserAvatarWithPresence } from '@renderer/components/messages/UserAvatar'
import { UserProfilePopover } from '@renderer/components/user/UserProfilePopover'
import { UserNameSkeleton } from '@renderer/components/messages/UserNameSkeleton'
import { useUserSearch } from '@renderer/components/messages/UserSearch'
import type { UserProfile } from '@shared/user'

export const MAX_GROUP_MEMBERS = 10
const MAX_GROUP_NAME_LENGTH = 64

function CrownIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.5 7.5 7 11l5-7 5 7 4.5-3.5L19 18H5L2.5 7.5ZM5 20h14v1.5H5V20Z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

export function UserPlusIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
      />
    </svg>
  )
}

const INPUT_CLASS =
  'h-10 w-full rounded-xl border border-border-card bg-secondary-bg px-3 text-sm text-primary-text placeholder-secondary-text transition-colors focus:border-button-info focus:outline-none'

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export function displayName(id: string, profile?: UserProfile): string {
  return profile?.username || profile?.name || `User #${id.slice(-6)}`
}

export function profileDisplayName(profile?: UserProfile): string | undefined {
  const globalName = profile?.global_name && profile.global_name !== 'None' ? profile.global_name : undefined
  return globalName || profile?.name || profile?.username || undefined
}

export function isOffline(profile?: UserProfile): boolean {
  const status = profile?.presence?.status?.toLowerCase()
  return !status || status === 'offline'
}

interface UserPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle: string
  confirmLabel: string | ((count: number) => string)
  /** Shown before anything is searched, e.g. people you already message. */
  suggestedIds: string[]
  excludeIds?: string[]
  maxSelect: number
  askGroupName?: boolean
  onConfirm: (users: UserProfile[], groupName: string) => Promise<void>
}

/** Pick people with checkboxes: the New Message and Invite to Group modals. */
export function UserPickerDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  confirmLabel,
  suggestedIds,
  excludeIds = [],
  maxSelect,
  askGroupName = false,
  onConfirm
}: UserPickerDialogProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [groupName, setGroupName] = useState('')
  const [selected, setSelected] = useState<UserProfile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { results, searchLoading, searchError } = useUserSearch(query)
  const suggestedProfiles = useUserProfiles(open ? suggestedIds : [])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setGroupName('')
    setSelected([])
    setError(null)
  }, [open])

  const searching = query.trim() !== ''
  const pool = searching
    ? results
    : suggestedIds.map((id) => suggestedProfiles.get(id)).filter((p): p is UserProfile => p !== undefined)
  const selectedIds = new Set(selected.map((u) => u.id))
  const visible = pool.filter((u) => !excludeIds.includes(u.id))
  const rows = [...visible, ...selected.filter((u) => !visible.some((v) => v.id === u.id))]
  const full = selected.length >= maxSelect
  const showGroupName = askGroupName && selected.length > 1

  const toggle = (user: UserProfile): void => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : full ? prev : [...prev, user]
    )
  }

  const submit = async (): Promise<void> => {
    if (selected.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(selected, groupName.trim())
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[560px] max-w-md">
        <div className="shrink-0 px-5 pt-5 pb-3">
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          <p className="mt-1 text-sm text-tertiary-text">{subtitle}</p>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className={`${INPUT_CLASS} mt-4`}
          />
          <p className="mt-1.5 text-xs text-tertiary-text">
            {full ? `You can pick up to ${maxSelect} ${maxSelect === 1 ? 'person' : 'people'}.` : 'Search for anyone by username.'}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {searching && searchLoading && rows.length === 0 && (
            <p className="py-6 text-center text-xs text-quaternary-text">Searching…</p>
          )}
          {searching && searchError && <p className="py-6 text-center text-xs text-form-error">{searchError}</p>}
          {!searchLoading && !searchError && rows.length === 0 && (
            <p className="py-6 text-center text-xs text-quaternary-text">
              {searching ? 'No users found.' : 'Search for someone to get started.'}
            </p>
          )}
          {rows.map((user) => {
            const checked = selectedIds.has(user.id)
            const disabled = !checked && full
            return (
              <label
                key={user.id}
                className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors ${disabled ? 'opacity-50' : 'cursor-pointer hover:bg-quaternary-bg'}`}
              >
                <UserAvatarWithPresence id={user.id} profile={user} className="h-8 w-8" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary-text">
                  {displayName(user.id, user)}
                </span>
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={() => toggle(user)}
                  className="h-5 w-5 rounded-md"
                  aria-label={displayName(user.id, user)}
                />
              </label>
            )
          })}
        </div>
        {error && <p className="px-5 pb-2 text-xs text-form-error">{error}</p>}
        <div
          aria-hidden={!showGroupName}
          className={`grid shrink-0 border-t border-border-primary transition-[grid-template-rows,opacity] duration-200 ease-out ${showGroupName ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="px-5 pt-5">
              <input
                value={groupName}
                tabIndex={showGroupName ? 0 : -1}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={MAX_GROUP_NAME_LENGTH}
                placeholder="Group name (optional)"
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-3 p-5">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => void submit()}
            disabled={submitting || selected.length === 0}
          >
            {typeof confirmLabel === 'function' ? confirmLabel(selected.length) : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface RenameGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: GroupChat
  onUpdated: (group: GroupChat) => void
}

/** Owner only. */
export function RenameGroupDialog({ open, onOpenChange, group, onUpdated }: RenameGroupDialogProps): React.JSX.Element {
  const { token } = useAuth()
  const [name, setName] = useState(group.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(group.name)
    setError(null)
  }, [open, group.name])

  const canSave = name.trim() !== '' && name.trim() !== group.name

  const save = async (): Promise<void> => {
    if (!token || !canSave) return
    setBusy(true)
    setError(null)
    try {
      onUpdated(await groupChatsApi.rename(token, group.id, name.trim()))
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err, 'Failed to rename group'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit group name</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save()
            }}
            maxLength={MAX_GROUP_NAME_LENGTH}
            placeholder="Group name"
            className={INPUT_CLASS}
          />
          {error && <p className="mt-2 text-xs text-form-error">{error}</p>}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border-primary p-5">
          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => void save()} disabled={busy || !canSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface LeaveGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: GroupChat
  currentUserId: string | null
  onRemoved: (groupId: string) => void
}

/** Opened from the X on the group's row. The owner can also delete it, behind its own confirmation. */
export function LeaveGroupDialog({
  open,
  onOpenChange,
  group,
  currentUserId,
  onRemoved
}: LeaveGroupDialogProps): React.JSX.Element {
  const { token } = useAuth()
  const isOwner = currentUserId !== null && group.owner_id === currentUserId
  // The API hands ownership to the longest-standing remaining member.
  const nextOwnerId = group.member_ids.find((id) => id !== currentUserId)
  const nextOwner = useUserProfiles(isOwner && nextOwnerId ? [nextOwnerId] : []).get(nextOwnerId ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setConfirmDelete(false)
    setError(null)
  }, [open])

  const run = async (action: 'leave' | 'delete'): Promise<void> => {
    if (!token || !currentUserId) return
    setBusy(true)
    setError(null)
    try {
      if (action === 'delete') await groupChatsApi.remove(token, group.id)
      else await groupChatsApi.removeMember(token, group.id, currentUserId)
      onOpenChange(false)
      onRemoved(group.id)
    } catch (err) {
      setError(errorMessage(err, action === 'delete' ? 'Failed to delete group' : 'Failed to leave group'))
    } finally {
      setBusy(false)
    }
  }

  const groupName = <span className="font-semibold text-primary-text">{group.name}</span>

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{confirmDelete ? `Delete ${group.name}` : `Leave ${group.name}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 px-5 py-4 text-sm text-secondary-text">
          {confirmDelete ? (
            <p>
              This deletes {groupName} and all of its messages for everyone. This can&apos;t be undone.
            </p>
          ) : (
            <>
              <p>
                Are you sure you want to leave {groupName}? You won&apos;t be able to rejoin unless someone invites
                you back.
              </p>
              {isOwner && nextOwnerId && (
                <p className="text-xs text-tertiary-text">
                  You&apos;re the owner, so{' '}
                  <span className="font-semibold text-secondary-text">{displayName(nextOwnerId, nextOwner)}</span> will
                  become the owner.
                </p>
              )}
            </>
          )}
          {error && <p className="text-xs text-form-error">{error}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t border-border-primary p-5">
          {isOwner && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              className="text-sm font-medium text-status-error hover:underline disabled:opacity-50"
            >
              Delete group
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => (confirmDelete ? setConfirmDelete(false) : onOpenChange(false))}
              disabled={busy}
            >
              {confirmDelete ? 'Back' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void run(confirmDelete ? 'delete' : 'leave')}
              disabled={busy}
            >
              {confirmDelete ? 'Delete Group' : 'Leave Group'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface GroupMembersSidebarProps {
  group: GroupChat
  currentUserId: string | null
  profiles: Map<string, UserProfile>
  onUpdated: (group: GroupChat) => void
  /** Opens the Invite to Group modal; null when you can't invite (not the owner, or full). */
  onInvite: (() => void) | null
}

export function GroupMembersSidebar({
  group,
  currentUserId,
  profiles,
  onUpdated,
  onInvite
}: GroupMembersSidebarProps): React.JSX.Element {
  const { token } = useAuth()
  const { typingUserIds } = useRealtime()
  const isOwner = currentUserId !== null && group.owner_id === currentUserId
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const removeMember = async (userId: string): Promise<void> => {
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      onUpdated(await groupChatsApi.removeMember(token, group.id, userId))
    } catch (err) {
      setError(errorMessage(err, 'Failed to remove member'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-l border-border-primary bg-secondary-bg">
      <p className="px-4 pt-4 pb-2 text-xs font-bold tracking-wide text-quaternary-text uppercase">
        Members — {group.member_ids.length}
      </p>
      {error && <p className="px-4 pb-2 text-xs text-form-error">{error}</p>}
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {group.member_ids.map((id) => {
          const profile = profiles.get(id)
          const label = profileDisplayName(profile)
          const typing = typingUserIds.has(groupTypingKey(group.id, id))
          // Offline members are dimmed, like Discord; hovering brings them back.
          const dim = isOffline(profile) && !typing ? 'opacity-35 transition-opacity group-hover:opacity-100' : ''
          return (
            <div key={id} className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-quaternary-bg">
              <UserProfilePopover userId={id} profile={profile}>
                <button type="button" className={`flex min-w-0 flex-1 items-center gap-2.5 text-left ${dim}`}>
                  <UserAvatarWithPresence id={id} profile={profile} typing={typing} className="h-8 w-8" />
                  <span className="min-w-0 truncate text-sm font-medium text-primary-text">
                    {label ?? <UserNameSkeleton />}
                  </span>
                  {id === group.owner_id && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="shrink-0 text-status-warning">
                          <CrownIcon className="h-3.5 w-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Group owner</TooltipContent>
                    </Tooltip>
                  )}
                </button>
              </UserProfilePopover>
              {isOwner && id !== currentUserId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => void removeMember(id)}
                      disabled={busy}
                      aria-label={`Remove ${label ?? 'member'}`}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-tertiary-text opacity-0 transition-all group-hover:opacity-100 hover:bg-black/10 hover:text-primary-text"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Remove from group</TooltipContent>
                </Tooltip>
              )}
            </div>
          )
        })}
      </div>
      {onInvite && (
        // Same size and spot as the message composer beside it.
        <div className="shrink-0 px-2 pb-2">
          <button
            type="button"
            onClick={onInvite}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-xl border border-border-card bg-tertiary-bg text-sm font-medium text-primary-text transition-colors hover:bg-quaternary-bg"
          >
            <UserPlusIcon className="h-4.5 w-4.5" />
            Invite to Group
          </button>
        </div>
      )}
    </aside>
  )
}
