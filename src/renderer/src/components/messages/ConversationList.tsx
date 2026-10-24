import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { groupTypingKey, useRealtime } from '@renderer/contexts/RealtimeContext'
import {
  chatKey,
  groupChatsApi,
  type ConversationSummary,
  type GroupChat,
  type GroupChatSummary
} from '@renderer/lib/messagesApi'
import { normalizeToMs } from '@renderer/lib/messageFormatting'
import { useUserProfiles } from '@renderer/hooks/useUserProfiles'
import { GroupAvatar, UserAvatarWithPresence } from '@renderer/components/messages/UserAvatar'
import { UserNameSkeleton } from '@renderer/components/messages/UserNameSkeleton'
import { UserSearch } from '@renderer/components/messages/UserSearch'
import {
  LeaveGroupDialog,
  MAX_GROUP_MEMBERS,
  UserPickerDialog,
  profileDisplayName
} from '@renderer/components/messages/GroupChatDialogs'
import { UserProfilePopover } from '@renderer/components/user/UserProfilePopover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import type { UserProfile } from '@shared/user'
import { KNOWN_ROBLOX_GAMES } from '@shared/robloxGames'

function XIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function UnreadBadge({ count, isSelected }: { count: number; isSelected: boolean }): React.JSX.Element {
  return (
    <span
      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${isSelected
        ? 'bg-primary-text/20 text-primary-text'
        : 'bg-card-tag-bg text-card-tag-text'
        }`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function groupTypingLabel(typerIds: string[], profiles: Map<string, UserProfile>): string {
  const name = (id: string): string => profileDisplayName(profiles.get(id)) ?? 'Someone'
  if (typerIds.length === 1) return `${name(typerIds[0])} is typing…`
  if (typerIds.length === 2) return `${name(typerIds[0])} and ${name(typerIds[1])} are typing…`
  return 'Several people are typing…'
}

type ConversationEntry =
  | { kind: 'dm'; conversation: ConversationSummary; activity: number }
  | { kind: 'group'; group: GroupChatSummary; activity: number }

interface ConversationListProps {
  conversations: ConversationSummary[]
  groups: GroupChatSummary[]
  currentUserId: string | null
  loading: boolean
  error: string | null
  selectedId: string | null
  onSelect: (key: string) => void
  onHide: (recipientId: string) => Promise<void>
  onUnhide: (recipientId: string) => Promise<void>
  onGroupCreated: (group: GroupChat) => void
  onGroupRemoved: (groupId: string) => void
}

const UNDO_TIMEOUT_MS = 5000

export function ConversationList({
  conversations,
  groups,
  currentUserId,
  loading,
  error,
  selectedId,
  onSelect,
  onHide,
  onUnhide,
  onGroupCreated,
  onGroupRemoved
}: ConversationListProps): React.JSX.Element {
  const profiles = useUserProfiles([
    ...conversations.map((c) => c.recipient_id),
    ...groups.flatMap((g) => g.member_ids)
  ])
  const { typingUserIds, robloxActivity } = useRealtime()
  const { token } = useAuth()
  const [newMessageOpen, setNewMessageOpen] = useState(false)
  const [leaving, setLeaving] = useState<GroupChat | null>(null)

  // One person opens a DM; more start a group named after them, like Discord.
  const startConversation = async (users: UserProfile[], groupName: string): Promise<void> => {
    if (users.length === 1) {
      onSelect(users[0].id)
      return
    }
    if (!token) return
    const name =
      groupName ||
      users
        .map((u) => profileDisplayName(u) ?? `User #${u.id.slice(-6)}`)
        .join(', ')
        .slice(0, 64)
    const group = await groupChatsApi.create(
      token,
      name,
      users.map((u) => u.id)
    )
    onGroupCreated(group)
    onSelect(chatKey({ kind: 'group', id: group.id }))
  }

  const entries: ConversationEntry[] = [
    ...conversations.map((conversation) => ({
      kind: 'dm' as const,
      conversation,
      activity: normalizeToMs(conversation.message?.created_at ?? 0)
    })),
    ...groups.map((group) => ({
      kind: 'group' as const,
      group,
      activity: normalizeToMs(group.message?.created_at ?? group.created_at)
    }))
  ].sort((a, b) => b.activity - a.activity)
  const [lastHidden, setLastHidden] = useState<{ id: string; label: string } | null>(null)
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
    }
  }, [])

  const handleHide = (recipientId: string, label: string): void => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
    setLastHidden({ id: recipientId, label })
    undoTimeoutRef.current = setTimeout(() => setLastHidden(null), UNDO_TIMEOUT_MS)
    void onHide(recipientId)
  }

  const handleUndo = (): void => {
    if (!lastHidden) return
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
    void onUnhide(lastHidden.id)
    setLastHidden(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <UserSearch onSelect={(user) => onSelect(user.id)} />
      <div className="flex items-center justify-between p-3">
        <h1 className="text-xs font-bold uppercase tracking-wide text-quaternary-text">Messages</h1>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setNewMessageOpen(true)}
              aria-label="New message"
              className="flex h-5 w-5 items-center justify-center rounded text-quaternary-text transition-colors hover:text-primary-text"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">New message</TooltipContent>
        </Tooltip>
      </div>
      {leaving && (
        <LeaveGroupDialog
          open
          onOpenChange={(open) => !open && setLeaving(null)}
          group={leaving}
          currentUserId={currentUserId}
          onRemoved={onGroupRemoved}
        />
      )}
      <UserPickerDialog
        open={newMessageOpen}
        onOpenChange={setNewMessageOpen}
        title="New Message"
        subtitle={`Group chats can have up to ${MAX_GROUP_MEMBERS} members.`}
        confirmLabel={(count) => (count > 1 ? 'Create Group' : 'Create Message')}
        suggestedIds={conversations.map((c) => c.recipient_id)}
        excludeIds={currentUserId ? [currentUserId] : []}
        maxSelect={MAX_GROUP_MEMBERS - 1}
        askGroupName
        onConfirm={startConversation}
      />

      {lastHidden && (
        <div className="mx-2 mb-1.5 flex items-center justify-between gap-2 rounded-md bg-tertiary-bg px-2.5 py-1.5 text-xs text-secondary-text">
          <span className="min-w-0 truncate">Hid {lastHidden.label}</span>
          <button
            type="button"
            onClick={handleUndo}
            className="shrink-0 font-semibold text-link hover:text-link-hover"
          >
            Undo
          </button>
        </div>
      )}

      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {loading && entries.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-quaternary-text">Loading…</p>
        )}

        {error && <p className="px-2 py-6 text-center text-xs text-form-error">{error}</p>}

        {!loading && !error && entries.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-quaternary-text">No conversations yet.</p>
        )}

        {entries.map((entry) => {
          if (entry.kind === 'group') {
            const { group } = entry
            const key = chatKey({ kind: 'group', id: group.id })
            const isSelected = selectedId === key
            const others = group.member_ids.filter((id) => id !== currentUserId)
            const typerIds = others.filter((id) => typingUserIds.has(groupTypingKey(group.id, id)))
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(key)
                  }
                }}
                className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors ${isSelected
                  ? 'bg-button-secondary/45 text-primary-text'
                  : 'hover:bg-quaternary-bg'
                  }`}
              >
                <GroupAvatar
                  groupId={group.id}
                  memberIds={group.member_ids}
                  fallbackIds={others.slice(0, 4)}
                  profiles={profiles}
                  className="h-8 w-8"
                />
                <div className="min-w-0 flex-1">
                  <span className={`block truncate text-base font-medium ${isSelected ? 'text-primary-text' : 'text-message-name group-hover:text-message-text'}`}>{group.name}</span>
                  {typerIds.length > 0 ? (
                    <span className="block truncate text-[11px] text-tertiary-text">
                      {groupTypingLabel(typerIds, profiles)}
                    </span>
                  ) : (
                    <span className="block truncate text-[11px] text-quaternary-text">
                      {group.member_ids.length} members
                    </span>
                  )}
                </div>
                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                  {group.unread_count > 0 && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-100 transition-opacity group-hover:opacity-0">
                      <UnreadBadge count={group.unread_count} isSelected={isSelected} />
                    </span>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLeaving(group)
                        }}
                        aria-label={`Leave ${group.name}`}
                        className={`flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100 ${isSelected
                          ? 'text-primary-text hover:bg-black/10'
                          : 'text-tertiary-text hover:bg-black/10 hover:text-primary-text'
                          }`}
                      >
                        <XIcon className="h-4.5 w-4.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Leave group</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )
          }

          const { recipient_id, unread_count } = entry.conversation
          const profile = profiles.get(recipient_id)
          const label = profileDisplayName(profile)
          const isSelected = selectedId === recipient_id
          const activity = robloxActivity.get(recipient_id)
          const gameName = activity?.placeId ? (KNOWN_ROBLOX_GAMES[activity.placeId] ?? 'Roblox') : null
          return (
            <div
              key={recipient_id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(recipient_id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(recipient_id)
                }
              }}
              title={recipient_id}
              className={`group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors ${isSelected
                ? 'bg-button-secondary/45 text-primary-text'
                : 'hover:bg-quaternary-bg'
                }`}
            >
              <UserProfilePopover userId={recipient_id} profile={profile}>
                <button type="button" className="shrink-0 rounded-full">
                  <UserAvatarWithPresence
                    id={recipient_id}
                    profile={profile}
                    typing={typingUserIds.has(recipient_id)}
                    className="h-8 w-8"
                  />
                </button>
              </UserProfilePopover>

              <div className="min-w-0 flex-1">
                {label ? (
                  <span className={`block truncate text-base font-medium ${isSelected ? 'text-primary-text' : 'text-message-name group-hover:text-message-text'}`}>
                    {label}
                  </span>
                ) : (
                  <UserNameSkeleton />
                )}
                {gameName && (
                  <span className="block truncate text-[11px] text-status-success-vibrant">
                    Playing {gameName}
                  </span>
                )}
              </div>

              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                {unread_count > 0 && (
                  <span
                    className={`pointer-events-none absolute inset-0 flex items-center justify-center opacity-100 transition-opacity group-hover:opacity-0`}
                  >
                    <UnreadBadge count={unread_count} isSelected={isSelected} />
                  </span>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleHide(recipient_id, label ?? `User #${recipient_id.slice(-6)}`)
                      }}
                      aria-label={`Hide conversation with ${label ?? 'this user'}`}
                      className={`flex h-7 w-7 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100 ${isSelected
                        ? 'text-primary-text hover:bg-black/10'
                        : 'text-tertiary-text hover:bg-black/10 hover:text-primary-text'
                        }`}
                    >
                      <XIcon className="h-4.5 w-4.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Hide conversation</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
