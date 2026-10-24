import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { MessagesIcon } from '@renderer/components/NavBar'
import { useConversation, type DisplayMessage } from '@renderer/hooks/useConversation'
import { useBlockedUsers } from '@renderer/hooks/useBlockedUsers'
import { groupTypingKey, useRealtime } from '@renderer/contexts/RealtimeContext'
import { useUserProfiles } from '@renderer/hooks/useUserProfiles'
import { useEmojis } from '@renderer/hooks/useEmojis'
import { recordEmojiUse, useFrequentEmojis } from '@renderer/hooks/useFrequentEmojis'
import { acknowledgeRead, isReadAcknowledged } from '@renderer/lib/localPreferences'
import { useRobloxGameIcons } from '@renderer/hooks/useRobloxGameIcons'
import { KNOWN_ROBLOX_GAMES } from '@shared/robloxGames'
import {
  formatMessageTimestamp,
  formatTimeOnly,
  formatDayDivider,
  describeMetadata,
  normalizeToMs,
  MENTION_PATTERN,
  mentionsToIds,
  mentionsToText,
  splitDraftMentions
} from '@renderer/lib/messageFormatting'
import { EmojiIcon, EmojiPicker } from '@renderer/components/messages/EmojiPicker'
import { Emoji, EmojiText } from '@renderer/components/messages/Emoji'
import { GroupAvatar, UserAvatar, UserAvatarWithPresence } from '@renderer/components/messages/UserAvatar'
import {
  GroupMembersSidebar,
  RenameGroupDialog,
  MAX_GROUP_MEMBERS,
  profileDisplayName,
  UserPickerDialog,
  UserPlusIcon
} from '@renderer/components/messages/GroupChatDialogs'
import { groupChatsApi } from '@renderer/lib/messagesApi'
import { groupTypingLabel } from '@renderer/components/messages/ConversationList'
import { UserNameSkeleton } from '@renderer/components/messages/UserNameSkeleton'
import { UserProfilePopover } from '@renderer/components/user/UserProfilePopover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@renderer/components/ui/context-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { ComposerActionsMenu } from '@renderer/components/messages/ComposerActionsMenu'
import { serversApi } from '@renderer/lib/serversApi'
import { JAILBREAK_PLACE_ID, buildRobloxGameDeepLink } from '@renderer/lib/robberyUtils'
import { FLOATING_PANEL_SURFACE } from '@renderer/lib/floatingPanelSurface'
import type { ChatTarget, GroupChat, MessageItem } from '@renderer/lib/messagesApi'
import { useAuth } from '@renderer/contexts/AuthContext'
import { tradesApi } from '@renderer/lib/tradesApi'
import { ItemSide } from '@renderer/components/trading/TradeAdDetailScreen'
import type { TradeOffer } from '@shared/trading'
import type { UserProfile } from '@shared/user'
import type { VipServerWithOwner } from '@shared/servers'
import { track } from '@renderer/lib/analytics'

const AVATAR_GROUP_GAP_MS = 5 * 60 * 1000
// Below this width (chat + member list), the member list stops taking room from the chat.
const MEMBERS_SIDEBAR_MIN_ROW_WIDTH = 900

const MAX_LENGTH = 350
const TEXTAREA_MIN_HEIGHT = 41
const TEXTAREA_MAX_HEIGHT = 260

function SendIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12L3.269 3.125A59.8 59.8 0 0 1 21.486 12a59.8 59.8 0 0 1-18.217 8.875zm0 0h7.5"
      />
    </svg>
  )
}

function SystemCheckIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  )
}

const TOOLBAR_BUTTON =
  'flex h-7 w-7 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text'

function CopyIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
      />
    </svg>
  )
}

function IdIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z"
      />
    </svg>
  )
}

function MoreIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  )
}

function ReplyIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h10.5a6 6 0 0 1 6 6v3" />
    </svg>
  )
}

function PencilSolidIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M3.2 13.9 2 17.3a.6.6 0 0 0 .7.7l3.4-1.2a3.6 3.6 0 0 0 1.3-.8l8.9-8.9a2.4 2.4 0 0 0-3.4-3.4L4 12.6a3.6 3.6 0 0 0-.8 1.3Z" />
    </svg>
  )
}

function EditIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125"
      />
    </svg>
  )
}

function DeleteIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  )
}

function ReportIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3v1.5M3 21V4.5m0 0A2.25 2.25 0 0 1 5.25 2.25h1.5a2.25 2.25 0 0 1 2.121 1.517l.6 1.8a2.25 2.25 0 0 0 2.122 1.516h5.907a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-6.75a2.25 2.25 0 0 1-2.121-1.517l-.6-1.8A2.25 2.25 0 0 0 5.906 9.75H3"
      />
    </svg>
  )
}

function XIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function BlockIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="m5.6 5.6 12.8 12.8" />
    </svg>
  )
}

function ArrowIcon({ className, left = false }: { className?: string; left?: boolean }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={left ? 'M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18' : 'M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3'}
      />
    </svg>
  )
}

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

function EyeIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function ExternalLinkIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  )
}

function GiftIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
      />
    </svg>
  )
}

function GameControllerIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="6" x2="10" y1="11" y2="11" />
      <line x1="8" x2="8" y1="9" y2="13" />
      <line x1="15" x2="15.01" y1="12" y2="12" />
      <line x1="18" x2="18.01" y1="10" y2="10" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"
      />
    </svg>
  )
}

function ServerIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 17.25v-.228a4.5 4.5 0 0 0-.12-1.03l-2.268-9.64a3.375 3.375 0 0 0-3.285-2.602H7.923a3.375 3.375 0 0 0-3.285 2.602l-2.268 9.64a4.5 4.5 0 0 0-.12 1.03v.228m19.5 0a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3m19.5 0a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3m16.5 0h.008v.008h-.008v-.008Zm-3 0h.008v.008h-.008v-.008Z"
      />
    </svg>
  )
}

const READ_RECEIPT_FLASH_MS = 4000
const READ_RECEIPT_FADE_MS = 500

function VipServerJoinAction({ serverId }: { serverId: number }): React.JSX.Element {
  const [server, setServer] = useState<VipServerWithOwner | null>()

  useEffect(() => {
    let cancelled = false
    serversApi
      .get(serverId)
      .then((result) => {
        if (!cancelled) setServer(result)
      })
      .catch(() => {
        if (!cancelled) setServer(null)
      })
    return () => {
      cancelled = true
    }
  }, [serverId])

  if (server === undefined) return <p className="text-xs text-quaternary-text">Loading server…</p>
  if (server === null) {
    return <p className="text-xs text-quaternary-text italic">This invite is no longer valid.</p>
  }
  return (
    <Button
      type="button"
      size="sm"
      onClick={() => {
        track('server_join_click', { source: 'vip_invite' })
        void window.api.openExternal(server.link)
      }}
    >
      <ExternalLinkIcon className="h-3.5 w-3.5" />
      Join Server
    </Button>
  )
}

function SystemEmbedCard({
  message,
  metadata,
  isMine,
  senderLabel
}: {
  message: DisplayMessage
  metadata: Record<string, unknown>
  isMine: boolean
  senderLabel: string
}): React.JSX.Element {
  const metaType = metadata.type

  let icon: React.ReactNode
  let title: string
  let description: string
  if (metaType === 'game_invite') {
    icon = <GameControllerIcon className="h-4 w-4" />
    title = 'Game Invite'
    description = message.content
  } else if (metaType === 'vip_server_invite') {
    icon = <ServerIcon className="h-4 w-4" />
    title = 'VIP Server Invite'
    description = message.content
  } else {
    const level = String(metadata.level)
    icon = <GiftIcon className="h-4 w-4" />
    title = `Supporter ${level} Gift`
    description = isMine ? `Sent a Supporter ${level} gift!` : `${senderLabel} sent you a Supporter ${level} gift!`
  }
  const gameIcons = useRobloxGameIcons()
  const accentClass = metaType === 'gift_sent' ? 'bg-status-success-vibrant' : 'bg-status-info'
  const iconClass = metaType === 'gift_sent' ? 'text-status-success-vibrant' : 'text-status-info'

  return (
    <div className="relative max-w-md overflow-hidden rounded-2xl bg-secondary-bg py-2 pr-3 pl-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${accentClass}`} />
      <p className={`flex items-center gap-1.5 text-sm font-semibold  ${iconClass}`}>
        {icon}
        {title}
      </p>
      {metaType === 'game_invite' && typeof metadata.place_id === 'string' ? (
        <div className="mt-2 flex items-center gap-3">
          {gameIcons[metadata.place_id] ? (
            <img
              src={gameIcons[metadata.place_id]}
              alt=""
              draggable={false}
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-tertiary-bg text-tertiary-text">
              <GameControllerIcon className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-primary-text">
              {KNOWN_ROBLOX_GAMES[metadata.place_id] ?? 'Roblox'}
            </p>
            <p className="text-sm text-secondary-text">{description}</p>
          </div>
          {metadata.place_id === JAILBREAK_PLACE_ID && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                track('server_join_click', { source: 'game_invite' })
                void window.api.openExternal(
                  buildRobloxGameDeepLink(
                    metadata.place_id as string,
                    typeof metadata.job_id === 'string' ? metadata.job_id : null
                  )
                )
              }}
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
              Join
            </Button>
          )}
        </div>
      ) : (
        <p className="mt-0.5 text-sm text-secondary-text">{description}</p>
      )}
      {metaType === 'vip_server_invite' && typeof metadata.server_id === 'number' && (
        <div className="mt-2">
          <VipServerJoinAction serverId={metadata.server_id} />
        </div>
      )}
      <p className="mt-1.5 text-[10px] text-quaternary-text">{formatMessageTimestamp(message.created_at)}</p>
    </div>
  )
}

function OfferAcceptedCard({
  message,
  tradeId,
  offerId
}: {
  message: DisplayMessage
  tradeId: number
  offerId: number | null
}): React.JSX.Element {
  const { token } = useAuth()
  const [offer, setOffer] = useState<TradeOffer | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    const load = offerId
      ? tradesApi.getOffer(token, tradeId, offerId)
      : tradesApi
          .listOffers(token, tradeId)
          .then((offers) => offers.find((o) => o.status === 1 || o.status === 3) ?? null)
    load
      .then((res) => {
        if (!cancelled) setOffer(res)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [token, tradeId, offerId])

  return (
    <div className="relative max-w-md overflow-hidden rounded-2xl bg-secondary-bg py-2 pr-3 pl-4">
      <span className="absolute inset-y-0 left-0 w-1 bg-status-success-vibrant" />
      <p className="flex items-center gap-1.5 text-sm font-semibold text-status-success-vibrant">
        <SystemCheckIcon className="h-4 w-4" />
        Trade Offer Accepted
      </p>
      <p className="mt-0.5 text-sm text-secondary-text">
        Offer on trade <span className="font-semibold text-primary-text">#{tradeId}</span> was accepted
      </p>
      {offer && (
        <div className="mt-2 grid grid-cols-2 gap-3">
          <ItemSide items={offer.offering ?? []} label="Offered" />
          <ItemSide items={offer.requesting ?? []} label="For" />
        </div>
      )}
      <p className="mt-1.5 text-[10px] text-quaternary-text">{formatMessageTimestamp(message.created_at)}</p>
    </div>
  )
}

const GROUP_EVENT_TYPES = new Set(['group_renamed', 'members_added', 'member_removed', 'member_left'])

function metadataUserIds(metadata: Record<string, unknown> | null): string[] {
  if (!metadata) return []
  const ids = Array.isArray(metadata.user_ids) ? metadata.user_ids : []
  return [...ids, metadata.user_id, metadata.new_owner_id].filter((id): id is string => typeof id === 'string')
}

function GroupEventText({
  message,
  metadata,
  profiles
}: {
  message: DisplayMessage
  metadata: Record<string, unknown>
  profiles: Map<string, UserProfile>
}): React.JSX.Element {
  const name = (id: unknown): React.JSX.Element => {
    if (typeof id !== 'string') return <span className="font-semibold text-primary-text">Someone</span>
    const profile = profiles.get(id)
    return (
      <UserProfilePopover userId={id} profile={profile}>
        <button type="button" className="font-semibold text-primary-text hover:underline">
          {profileDisplayName(profile) ?? `User #${id.slice(-6)}`}
        </button>
      </UserProfilePopover>
    )
  }
  const sender = name(message.sender_id)

  switch (metadata.type) {
    case 'group_renamed':
      return (
        <>
          {sender} changed the group name: <span className="font-semibold text-primary-text">{String(metadata.new_name ?? '')}</span>
        </>
      )
    case 'members_added': {
      const ids = Array.isArray(metadata.user_ids) ? metadata.user_ids : []
      return (
        <>
          {sender} added{' '}
          {ids.map((id, i) => (
            <span key={String(id)}>
              {i > 0 && (i === ids.length - 1 ? ' and ' : ', ')}
              {name(id)}
            </span>
          ))}{' '}
          to the group.
        </>
      )
    }
    case 'member_removed':
      return (
        <>
          {sender} removed {name(metadata.user_id)} from the group.
        </>
      )
    default:
      return (
        <>
          {name(metadata.user_id ?? message.sender_id)} left the group.
          {typeof metadata.new_owner_id === 'string' && <> {name(metadata.new_owner_id)} is now the owner.</>}
        </>
      )
  }
}

function SystemMessageText({ metadata }: { metadata: Record<string, unknown> }): React.JSX.Element {
  if (metadata.type === 'offer_accepted' && metadata.trade) {
    return (
      <>
        Trade offer <span className="font-semibold text-primary-text">#{String(metadata.trade)}</span>{' '}
        was accepted
      </>
    )
  }
  return <>{describeMetadata(metadata)}</>
}

function profileLabel(profile?: UserProfile): string | undefined {
  return profileDisplayName(profile)
}

function MessageText({
  text,
  profileOf
}: {
  text: string
  profileOf: (id: string) => UserProfile | undefined
}): React.JSX.Element {
  const parts = text.split(new RegExp(MENTION_PATTERN.source))
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part ? <EmojiText key={i} text={part} /> : null
        const profile = profileOf(part)
        const label = profileLabel(profile)
        if (!label) {
          return (
            <span key={i} className="rounded-[3px] bg-button-info/30 px-0.5 font-medium text-[color-mix(in_srgb,var(--color-button-info)_25%,white)]">
              @unknown-user
            </span>
          )
        }
        return (
          <UserProfilePopover key={i} userId={part} profile={profile}>
            <button type="button" className="rounded-[3px] bg-button-info/30 px-0.5 font-medium text-[color-mix(in_srgb,var(--color-button-info)_25%,white)] transition-colors hover:bg-button-info hover:text-white">
              @{label}
            </button>
          </UserProfilePopover>
        )
      })}
    </>
  )
}

function ReactionPicker({ onSelect }: { onSelect: (emoji: string) => void }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const emojis = Object.values(useEmojis())

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setTooltipOpen(false)
      }}
    >
      <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Add reaction"
              className={TOOLBAR_BUTTON}
            >
              <EmojiIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Add Reaction</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-auto p-1.5" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="grid grid-cols-7 gap-1">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setOpen(false)
                setTooltipOpen(false)
                onSelect(emoji)
              }}
              className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-quaternary-bg"
            >
              <Emoji emoji={emoji} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function MessageActionsMenu({
  isMine,
  canDelete,
  onReply,
  onEdit,
  onDelete,
  onReport
}: {
  isMine: boolean
  canDelete: boolean
  onReply: () => void
  onEdit: () => void
  onDelete: () => void
  onReport: () => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)

  const close = (): void => {
    setOpen(false)
    setTooltipOpen(false)
  }

  const item = (
    key: string,
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    destructive = false
  ): React.JSX.Element => (
    <button
      key={key}
      type="button"
      onClick={() => {
        close()
        onClick()
      }}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${destructive
        ? 'text-status-error hover:bg-status-error/10'
        : 'text-primary-text hover:bg-quaternary-bg'
        }`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setTooltipOpen(false)
      }}
    >
      <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="More options"
              className={TOOLBAR_BUTTON}
            >
              <MoreIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>More</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        className="w-40 p-1"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {item('reply', <ReplyIcon className="h-4 w-4" />, 'Reply', onReply)}
        {isMine && item('edit', <EditIcon className="h-4 w-4" />, 'Edit', onEdit, false)}
        {canDelete && item('delete', <DeleteIcon className="h-4 w-4" />, 'Delete', onDelete, true)}
        {!isMine && item('report', <ReportIcon className="h-4 w-4" />, 'Report', onReport, true)}
      </PopoverContent>
    </Popover>
  )
}

function MessageRow({
  message,
  showSenderInfo,
  senderId,
  senderProfile,
  profiles,
  profileOf,
  toMentionIds,
  currentUserId,
  frequentEmojis,
  allEmojis,
  isMine,
  canDelete,
  parentMessage,
  parentSenderProfile,
  onReply,
  onEdit,
  onDelete,
  onReport,
  onToggleReaction,
  onRetry,
  onDiscard,
  onJumpToMessage,
  isHighlighted,
  isReplyTarget,
  isReplyToMe,
  registerRef,
  showReadReceipt
}: {
  message: DisplayMessage
  showSenderInfo: boolean
  senderId: string
  senderProfile?: UserProfile
  profiles: Map<string, UserProfile>
  profileOf: (id: string) => UserProfile | undefined
  toMentionIds: (text: string) => string
  currentUserId: string | null
  frequentEmojis: string[]
  allEmojis: string[]
  isMine: boolean
  canDelete: boolean
  parentMessage?: MessageItem
  parentSenderProfile?: UserProfile
  onReply: (message: MessageItem) => void
  onEdit: (messageId: string, content: string) => Promise<void>
  onDelete: (messageId: string) => Promise<void>
  onReport: (messageId: string, reason: string) => Promise<void>
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>
  onRetry: (localId: string) => void
  onDiscard: (localId: string) => void
  onJumpToMessage: (messageId: string) => void
  isHighlighted: boolean
  isReplyTarget: boolean
  isReplyToMe: boolean
  registerRef: (id: string, el: HTMLDivElement | null) => void
  showReadReceipt: boolean
}): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState(message.content)
  const [editSaving, setEditSaving] = useState(false)
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
  const isPending = message.status === 'sending'
  const isRead = isMine && showReadReceipt && message.read_at != null

  const [showReadFlash, setShowReadFlash] = useState(false)
  const [readIndicatorMounted, setReadIndicatorMounted] = useState(false)
  useEffect(() => {
    if (!isRead || isReadAcknowledged(message.id)) {
      setShowReadFlash(false)
      setReadIndicatorMounted(false)
      return
    }
    setReadIndicatorMounted(true)
    setShowReadFlash(true)
    const hide = setTimeout(() => {
      setShowReadFlash(false)
      acknowledgeRead(message.id)
    }, READ_RECEIPT_FLASH_MS)
    const unmount = setTimeout(() => setReadIndicatorMounted(false), READ_RECEIPT_FLASH_MS + READ_RECEIPT_FADE_MS)
    return () => {
      clearTimeout(hide)
      clearTimeout(unmount)
    }
  }, [isRead, message.id])
  const isFailed = message.status === 'failed'

  if (message.metadata) {
    const metadata = message.metadata
    const metaType = metadata.type

    if (metaType === 'offer_accepted' && typeof metadata.trade === 'number') {
      return (
        <div className="group rounded px-5 py-1.5 pt-1 hover:bg-tertiary-bg">
          <OfferAcceptedCard
            message={message}
            tradeId={metadata.trade}
            offerId={typeof metadata.offer === 'number' ? metadata.offer : null}
          />
        </div>
      )
    }

    if (typeof metaType === 'string' && GROUP_EVENT_TYPES.has(metaType)) {
      const icon =
        metaType === 'members_added' ? (
          <ArrowIcon className="h-4.5 w-4.5 text-status-success" />
        ) : metaType === 'group_renamed' ? (
          <EditIcon className="h-4.5 w-4.5 text-tertiary-text" />
        ) : (
          <ArrowIcon left className="h-4.5 w-4.5 text-[color-mix(in_srgb,var(--color-status-error)_70%,black)]" />
        )
      return (
        <div className="group mt-2 flex items-center gap-3 rounded px-5 py-1 hover:bg-tertiary-bg">
          <div className="flex w-9 shrink-0 justify-center">{icon}</div>
          <p className="min-w-0 flex-1 text-sm text-tertiary-text">
            <GroupEventText message={message} metadata={metadata} profiles={profiles} />{' '}
            <span className="text-xs text-message-muted">{formatMessageTimestamp(message.created_at)}</span>
          </p>
        </div>
      )
    }

    if (metaType === 'game_invite' || metaType === 'vip_server_invite' || metaType === 'gift_sent') {
      return (
        <div className="group rounded px-5 py-1.5 pt-1 hover:bg-tertiary-bg">
          <SystemEmbedCard
            message={message}
            metadata={metadata}
            isMine={isMine}
            senderLabel={profileDisplayName(senderProfile) ?? `User #${senderId.slice(-6)}`}
          />
        </div>
      )
    }

    return (
      <div className="group flex items-center gap-3 rounded px-5 py-1.5 hover:bg-tertiary-bg">
        <div className="flex w-9 shrink-0 items-center justify-center">
          <SystemCheckIcon className="h-5 w-5 text-status-success-vibrant" />
        </div>
        <p className="min-w-0 flex-1 text-sm text-secondary-text">
          <SystemMessageText metadata={metadata} />{' '}
          <span className="text-[10px] text-quaternary-text">
            {formatMessageTimestamp(message.created_at)}
          </span>
        </p>
      </div>
    )
  }

  const label = profileDisplayName(senderProfile)
  const parentLabel = profileDisplayName(parentSenderProfile)

  const saveEdit = async (): Promise<void> => {
    const content = toMentionIds(editDraft.trim())
    if (!content || content === message.content) {
      setIsEditing(false)
      setEditDraft(message.content)
      return
    }
    setEditSaving(true)
    try {
      await onEdit(message.id, content)
      setIsEditing(false)
    } catch {
    } finally {
      setEditSaving(false)
    }
  }

  const react = (emoji: string): void => {
    if (!currentUserId || !message.reactions?.[emoji]?.includes(currentUserId)) recordEmojiUse(emoji)
    void onToggleReaction(message.id, emoji)
  }

  const displayText = (): string => mentionsToText(message.content, (id) => profileLabel(profileOf(id)))

  const startEditing = (): void => {
    setEditDraft(mentionsToText(message.content, (id) => profileOf(id)?.username || undefined))
    setIsEditing(true)
  }

  const [deleteOpen, setDeleteOpen] = useState(false)
  const handleDelete = (): void => setDeleteOpen(true)

  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)

  const handleReport = (): void => {
    setReportReason('')
    setReportOpen(true)
  }

  const submitReport = async (): Promise<void> => {
    const reason = reportReason.trim()
    if (!reason) return
    setReportSubmitting(true)
    try {
      await onReport(message.id, reason)
      setReportOpen(false)
    } catch {
    } finally {
      setReportSubmitting(false)
    }
  }

  const canShowActions = !isEditing && !isPending && !isFailed

  const rowContent = (
    <div
      ref={(el) => registerRef(message.id, el)}
      className={`group relative px-5 py-0.5 transition-colors duration-150 hover:bg-tertiary-bg ${showSenderInfo || message.parent_id ? 'mt-[17px]' : ''
        } ${isHighlighted
          ? 'bg-status-info/15'
          : isReplyTarget
            ? 'bg-button-info/10 shadow-[inset_2px_0_0_var(--color-button-info)] hover:bg-button-info/10!'
            : isReplyToMe
              ? 'bg-status-warning/10 shadow-[inset_2px_0_0_var(--color-status-warning)] hover:bg-status-warning/15!'
              : isContextMenuOpen
                ? 'bg-tertiary-bg'
                : ''
        }`}
    >
      {message.parent_id && (
        <div className="relative mb-1 flex h-5 items-center pl-12">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 bottom-[-2px] left-[17px] -mt-px w-[27px] rounded-tl-md border-t-2 border-l-2 border-tertiary-text/70"
          />
          <div className="flex min-w-0 flex-1 items-center gap-1 text-sm text-message-muted">
            {parentMessage ? (
              <>
                <UserProfilePopover userId={parentMessage.sender_id} profile={parentSenderProfile}>
                  <button type="button" className="group/reply-name flex shrink-0 items-center gap-1">
                    <UserAvatar id={parentMessage.sender_id} profile={parentSenderProfile} className="h-4 w-4 shrink-0" />
                    {parentLabel ? (
                      <span className="font-medium text-message-text group-hover/reply-name:underline">@{parentLabel}</span>
                    ) : (
                      <UserNameSkeleton className="w-14" />
                    )}
                  </button>
                </UserProfilePopover>
                <button
                  type="button"
                  onClick={() => onJumpToMessage(parentMessage.id)}
                  className="min-w-0 truncate text-left transition-colors hover:text-message-text"
                >
                  {mentionsToText(parentMessage.content, (id) => profileLabel(profileOf(id))) || '(a message)'}
                </button>
              </>
            ) : (
              <span>Replying to a message</span>
            )}
          </div>
        </div>
      )}
      <div className="relative flex gap-3">
        <div className="flex w-9 shrink-0 items-start justify-center">
          {showSenderInfo || parentMessage ? (
            <UserProfilePopover userId={senderId} profile={senderProfile}>
              <button type="button" className="rounded-full">
                <UserAvatar id={senderId} profile={senderProfile} className="h-9 w-9" />
              </button>
            </UserProfilePopover>
          ) : (
            <span className="hidden pt-1 text-[11px] whitespace-nowrap text-message-muted group-hover:block">
              {formatTimeOnly(message.created_at)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {(showSenderInfo || parentMessage) && (
            <div className="flex items-baseline gap-2">
              <UserProfilePopover userId={senderId} profile={senderProfile}>
                <button type="button" className="min-w-0 truncate text-left text-base font-medium text-message-header hover:underline">
                  {label}
                </button>
              </UserProfilePopover>
              <span className="shrink-0 text-xs text-message-muted">
                {formatMessageTimestamp(message.created_at)}
              </span>
              {readIndicatorMounted && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={`inline-flex shrink-0 text-quaternary-text transition-opacity duration-500 ease-in-out starting:opacity-0 ${showReadFlash ? 'opacity-100' : 'opacity-0'
                        }`}
                    >
                      <EyeIcon className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Read</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
          {isEditing ? (
            <div className="space-y-1.5 pt-0.5">
              <div className="flex rounded-xl border border-border-card bg-tertiary-bg px-4 py-2.5">
                <textarea
                  autoFocus
                  onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void saveEdit()
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      setIsEditing(false)
                      setEditDraft(message.content)
                    }
                  }}
                  rows={1}
                  maxLength={MAX_LENGTH}
                  className="box-border max-h-64 w-full resize-none overflow-y-auto border-none bg-transparent text-base leading-6 text-primary-text shadow-none field-sizing-content focus:outline-none"
                />
              </div>
              <p className="text-xs text-tertiary-text">
                escape to{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setEditDraft(message.content)
                  }}
                  className="text-link hover:underline"
                >
                  cancel
                </button>{' '}
                · enter to{' '}
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  disabled={editSaving}
                  className="text-link hover:underline disabled:opacity-50"
                >
                  save
                </button>
              </p>
            </div>
          ) : (
            <>
              <p
                className={`text-base leading-[1.375rem] whitespace-pre-wrap break-words ${isFailed
                  ? 'text-status-error'
                  : isPending
                    ? 'text-message-text/50'
                    : 'text-message-text'
                  }`}
              >
                <MessageText text={message.content} profileOf={profileOf} />
                {message.updated_at != null && message.updated_at > message.created_at && (
                  <span className="ml-1 text-xs text-quaternary-text">(edited)</span>
                )}
              </p>
              {message.reactions && Object.keys(message.reactions).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(message.reactions).map(([emoji, users]) => (
                    <Tooltip key={emoji}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => react(emoji)}
                          className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-lg leading-none transition-colors ${currentUserId && users.includes(currentUserId)
                            ? 'border-button-info/40 bg-button-info/20'
                            : 'border-border-card bg-tertiary-bg hover:bg-quaternary-bg'
                            }`}
                        >
                          <Emoji emoji={emoji} />
                          <span className="text-sm font-semibold text-secondary-text">{users.length}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {users.map((id) => profileLabel(profileOf(id)) ?? 'unknown-user').join(', ')}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}
              {isFailed && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-status-error">
                  <span>Failed to send</span>
                  <button
                    type="button"
                    onClick={() => onRetry(message.id)}
                    className="font-semibold hover:underline"
                  >
                    Retry
                  </button>
                  <span className="text-tertiary-text">·</span>
                  <button
                    type="button"
                    onClick={() => onDiscard(message.id)}
                    className="font-semibold hover:underline"
                  >
                    Delete
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      </div>
      {canShowActions && (
        <div className="absolute -top-1 right-7 z-10 flex -translate-y-1/2 items-center gap-0.5 rounded-md border border-border-primary bg-secondary-bg p-0.5 opacity-0 transition-opacity group-hover:opacity-100 has-[[data-state=open]]:opacity-100">
          {frequentEmojis.slice(0, 3).map((emoji) => (
            <button key={emoji} type="button" aria-label={`React with ${emoji}`} onClick={() => react(emoji)} className={TOOLBAR_BUTTON}>
              <Emoji emoji={emoji} />
            </button>
          ))}
          {frequentEmojis.length > 0 && <span aria-hidden className="mx-0.5 h-4 w-px bg-border-primary" />}
          <ReactionPicker onSelect={react} />
          <MessageActionsMenu
            isMine={isMine}
            canDelete={canDelete}
            onReply={() => onReply(message)}
            onEdit={startEditing}
            onDelete={handleDelete}
            onReport={handleReport}
          />
        </div>
      )}
    </div>
  )

  if (!canShowActions) return rowContent

  const deleteDialog = (
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete message?</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4 text-sm text-secondary-text">This cannot be undone.</div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border-primary p-5">
          <Button type="button" variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              setDeleteOpen(false)
              void onDelete(message.id)
            }}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  const reportDialog = (
    <Dialog open={reportOpen} onOpenChange={(open) => !open && setReportOpen(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Report message</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4">
          <textarea
            autoFocus
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Why are you reporting this message?"
            rows={3}
            className="w-full resize-none rounded-xl border border-border-card bg-form-input px-3 py-2 text-sm text-primary-text outline-none focus:border-border-focus"
          />
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border-primary p-5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setReportOpen(false)}
            disabled={reportSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => void submitReport()}
            disabled={reportSubmitting || !reportReason.trim()}
          >
            {reportSubmitting ? 'Reporting…' : 'Report'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <>
      <ContextMenu onOpenChange={setIsContextMenuOpen}>
        <ContextMenuTrigger asChild>{rowContent}</ContextMenuTrigger>
        <ContextMenuContent className="w-52" onCloseAutoFocus={(e) => e.preventDefault()}>
          {frequentEmojis.length > 0 && (
            <div className="flex gap-1 p-1">
              {frequentEmojis.map((emoji) => (
                <ContextMenuItem
                  key={emoji}
                  aria-label={`React with ${emoji}`}
                  onClick={() => react(emoji)}
                  className="h-9 flex-1 justify-center bg-tertiary-bg p-0 text-lg"
                >
                  <Emoji emoji={emoji} />
                </ContextMenuItem>
              ))}
            </div>
          )}
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <EmojiIcon className="h-4 w-4" />
              Add Reaction
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="p-1.5">
              <div className="grid grid-cols-7 gap-1">
                {allEmojis.map((emoji) => (
                  <ContextMenuItem
                    key={emoji}
                    aria-label={`React with ${emoji}`}
                    onClick={() => react(emoji)}
                    className="h-8 w-8 justify-center p-0 text-lg"
                  >
                    <Emoji emoji={emoji} />
                  </ContextMenuItem>
                ))}
              </div>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onReply(message)}>
            <ReplyIcon className="h-4 w-4" />
            Reply
          </ContextMenuItem>
          {isMine && (
            <ContextMenuItem onClick={startEditing}>
              <EditIcon className="h-4 w-4" />
              Edit
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={() => void navigator.clipboard.writeText(displayText())}>
            <CopyIcon className="h-4 w-4" />
            Copy Text
          </ContextMenuItem>
          <ContextMenuSeparator />
          {canDelete && (
            <ContextMenuItem destructive onClick={handleDelete}>
              <DeleteIcon className="h-4 w-4" />
              Delete
            </ContextMenuItem>
          )}
          {!isMine && (
            <ContextMenuItem destructive onClick={handleReport}>
              <ReportIcon className="h-4 w-4" />
              Report
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => void navigator.clipboard.writeText(message.id)}>
            <IdIcon className="h-4 w-4" />
            Copy Message ID
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {reportDialog}
      {deleteDialog}
    </>
  )
}

interface ComposerQuery {
  trigger: ':' | '@'
  text: string
}

const COMPOSER_QUERY_PATTERN = /(?:^|\s)([:@])([a-z0-9_.]{0,32})$/i

function composerQueryAtCursor(text: string, cursor: number): ComposerQuery | null {
  const match = text.slice(0, cursor).match(COMPOSER_QUERY_PATTERN)
  return match ? { trigger: match[1] as ComposerQuery['trigger'], text: match[2] } : null
}

interface ConversationThreadProps {
  target: ChatTarget | null
  group?: GroupChat
  currentUser: UserProfile | null
  /** People to suggest in the Invite to Group modal, e.g. your DM partners. */
  suggestedUserIds: string[]
  onRead?: () => void
  onGroupUpdated: (group: GroupChat) => void
}

export function ConversationThread({
  target,
  group,
  currentUser,
  suggestedUserIds,
  onRead,
  onGroupUpdated
}: ConversationThreadProps): React.JSX.Element {
  const { token } = useAuth()
  // recipientId is the chat id: the other user for a DM, the group id for a group.
  const recipientId = target?.id ?? null
  const isGroup = target?.kind === 'group'
  const isGroupOwner = isGroup && currentUser !== null && group?.owner_id === currentUser.id
  const [settingsOpen, setSettingsOpen] = useState(false)
  // The member list sits beside the chat when there's room. Narrower, it hides on its own and the
  // members button opens it over the chat instead, like Discord.
  const [membersPinned, setMembersPinned] = useState(true)
  const [membersOverlayOpen, setMembersOverlayOpen] = useState(false)
  const [chatRow, setChatRow] = useState<HTMLDivElement | null>(null)
  const [chatRowWidth, setChatRowWidth] = useState(0)
  useEffect(() => {
    if (!chatRow) return undefined
    const observer = new ResizeObserver(([entry]) => setChatRowWidth(entry.contentRect.width))
    observer.observe(chatRow)
    return () => observer.disconnect()
  }, [chatRow])
  const membersNarrow = chatRowWidth > 0 && chatRowWidth < MEMBERS_SIDEBAR_MIN_ROW_WIDTH
  const showMembers = membersNarrow ? membersOverlayOpen : membersPinned
  const toggleMembers = (): void =>
    membersNarrow ? setMembersOverlayOpen((open) => !open) : setMembersPinned((pinned) => !pinned)
  useEffect(() => setMembersOverlayOpen(false), [recipientId, membersNarrow])
  const [inviteOpen, setInviteOpen] = useState(false)
  const canInvite = isGroupOwner && group !== undefined && group.member_ids.length < MAX_GROUP_MEMBERS
  const {
    items,
    loading,
    error,
    hasMore,
    loadOlder,
    sendMessage,
    retrySend,
    discardFailedSend,
    editMessage,
    deleteMessage,
    reportMessage,
    toggleReaction,
    notifyTyping
  } = useConversation(target, currentUser?.id ?? null, onRead)
  const { typingUserIds } = useRealtime()
  const typerIds = !recipientId
    ? []
    : isGroup
      ? (group?.member_ids ?? []).filter(
        (id) => id !== currentUser?.id && typingUserIds.has(groupTypingKey(recipientId, id))
      )
      : typingUserIds.has(recipientId)
        ? [recipientId]
        : []
  const recipientIsTyping = typerIds.length > 0
  // Groups also need senders who have since left, so their old messages keep a name.
  const mentionIds = items.flatMap((m) => Array.from(m.content.matchAll(MENTION_PATTERN), (match) => match[1]))
  const profileIds = !recipientId
    ? []
    : [
      ...new Set([
        ...(isGroup
          ? [
            ...(group?.member_ids ?? []),
            ...items.flatMap((m) => [m.sender_id, ...metadataUserIds(m.metadata), ...Object.values(m.reactions ?? {}).flat()])
          ]
          : [recipientId]),
        ...mentionIds
      ])
    ]
  const profiles = useUserProfiles(profileIds)
  const profileOf = (id: string): UserProfile | undefined =>
    currentUser && id === currentUser.id ? currentUser : profiles.get(id)
  const { isBlocked, block, unblock } = useBlockedUsers()
  const blocked = !isGroup && recipientId !== null && isBlocked(recipientId)
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false)

  const handleToggleBlock = async (): Promise<void> => {
    if (!recipientId) return
    if (blocked) {
      await unblock(recipientId).catch(() => { })
      return
    }
    setBlockConfirmOpen(true)
  }

  const confirmBlock = async (): Promise<void> => {
    if (!recipientId) return
    setBlockConfirmOpen(false)
    await block(recipientId).catch(() => { })
  }
  const emojis = useEmojis()
  const allEmojis = Object.values(emojis)
  const frequentEmojis = useFrequentEmojis(4)

  const [draft, setDraft] = useState('')
  const [composerQuery, setComposerQuery] = useState<ComposerQuery | null>(null)
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const [replyTo, setReplyTo] = useState<MessageItem | null>(null)
  const [pendingReplyTo, setPendingReplyTo] = useState<MessageItem | null>(null)
  useEffect(() => {
    if (replyTo) {
      setPendingReplyTo(replyTo)
      return
    }
    const timeout = setTimeout(() => setPendingReplyTo(null), 200)
    return () => clearTimeout(timeout)
  }, [replyTo])
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [scrollNode, setScrollNode] = useState<HTMLDivElement | null>(null)
  const setScrollRef = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node
    setScrollNode(node)
  }, [])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const draftMirrorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!replyTo) return
    const timer = setTimeout(() => textareaRef.current?.focus(), 0)
    return () => clearTimeout(timer)
  }, [replyTo])
  const prevRecipientRef = useRef<string | null>(null)
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const registerMessageRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) messageRefs.current.set(id, el)
    else messageRefs.current.delete(id)
  }, [])

  const handleJumpToMessage = useCallback((messageId: string) => {
    const el = messageRefs.current.get(messageId)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current)
    setHighlightedId(messageId)
    highlightTimeoutRef.current = setTimeout(() => setHighlightedId(null), 1500)
  }, [])

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current)
    }
  }, [])

  const mentionCandidates = (isGroup ? group?.member_ids ?? [] : recipientId ? [recipientId] : [])
    .filter((id) => id !== currentUser?.id)
    .map((id) => profiles.get(id))
    .filter((profile): profile is UserProfile => Boolean(profile?.username))
  const toMentionIds = (text: string): string => mentionsToIds(text, mentionCandidates)

  const queryText = composerQuery?.text.toLowerCase() ?? ''
  const suggestions: { key: string; insert: string; label: React.ReactNode }[] = !composerQuery
    ? []
    : composerQuery.trigger === '@'
      ? mentionCandidates
        .filter(
          (p) =>
            p.username.toLowerCase().startsWith(queryText) ||
            profileDisplayName(p)?.toLowerCase().startsWith(queryText)
        )
        .slice(0, 8)
        .map((p) => ({
          key: p.id,
          insert: `@${p.username}`,
          label: (
            <>
              <UserAvatar id={p.id} profile={p} className="h-6 w-6 shrink-0" />
              <span className="text-primary-text">{profileDisplayName(p)}</span>
              <span className="text-tertiary-text">{p.username}</span>
            </>
          )
        }))
      : Object.entries(emojis)
        .filter(([name]) => name.toLowerCase().startsWith(queryText))
        .slice(0, 8)
        .map(([name, emoji]) => ({
          key: name,
          insert: emoji,
          label: (
            <>
              <span className="text-lg">
                <Emoji emoji={emoji} />
              </span>
              <span className="text-primary-text">:{name}:</span>
            </>
          )
        }))
  const outgoing = toMentionIds(draft.trim())

  const [isScrolledUp, setIsScrolledUp] = useState(false)
  const isScrolledUpRef = useRef(false)
  isScrolledUpRef.current = isScrolledUp
  const lastItemIdRef = useRef<string | null>(null)

  useEffect(() => {
    const last = items[items.length - 1]
    const sentNewMessage = last !== undefined && last.id !== lastItemIdRef.current && last.sender_id === currentUser?.id
    lastItemIdRef.current = last?.id ?? null
    if (recipientId !== prevRecipientRef.current) {
      prevRecipientRef.current = recipientId
      return
    }
    if (isScrolledUpRef.current && !sentNewMessage) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [items, recipientId, currentUser?.id])

  useEffect(() => {
    if (!scrollNode) return
    const observer = new ResizeObserver(() => {
      if (!isScrolledUpRef.current) scrollNode.scrollTop = scrollNode.scrollHeight
    })
    observer.observe(scrollNode)
    return () => observer.disconnect()
  }, [scrollNode])

  useEffect(() => {
    if (!scrollNode) return
    const AT_BOTTOM_THRESHOLD_PX = 4
    const handleScroll = (): void => {
      const distanceFromBottom = scrollNode.scrollHeight - scrollNode.scrollTop - scrollNode.clientHeight
      setIsScrolledUp(distanceFromBottom > AT_BOTTOM_THRESHOLD_PX)
    }
    handleScroll()
    scrollNode.addEventListener('scroll', handleScroll)
    return () => scrollNode.removeEventListener('scroll', handleScroll)
  }, [scrollNode])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [recipientId])

  const replyBarShown = Boolean(replyTo)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el || isScrolledUpRef.current) return
    // The bottom padding animates for 200ms, so keep pinning until it settles.
    const until = performance.now() + 250
    let frame = 0
    const pin = (): void => {
      el.scrollTop = el.scrollHeight
      if (performance.now() < until) frame = requestAnimationFrame(pin)
    }
    pin()
    return () => cancelAnimationFrame(frame)
  }, [replyBarShown])

  useEffect(() => {
    setReplyTo(null)
  }, [recipientId])

  useEffect(() => {
    if (!replyTo) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !e.defaultPrevented) setReplyTo(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [replyTo])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const next = Math.min(Math.max(el.scrollHeight, TEXTAREA_MIN_HEIGHT), TEXTAREA_MAX_HEIGHT)
    el.style.height = `${next}px`
  }, [draft, replyTo])

  const insertAtCursor = (text: string): void => {
    const el = textareaRef.current
    const start = el?.selectionStart ?? draft.length
    const end = el?.selectionEnd ?? draft.length
    const next = draft.slice(0, start) + text + draft.slice(end)
    setDraft(next)
    requestAnimationFrame(() => {
      el?.focus()
      const cursor = start + text.length
      el?.setSelectionRange(cursor, cursor)
    })
  }

  const acceptSuggestion = (insert: string): void => {
    const el = textareaRef.current
    const cursor = el?.selectionStart ?? draft.length
    const upToCursor = draft.slice(0, cursor)
    const match = upToCursor.match(/[:@][a-z0-9_.]{0,32}$/i)
    if (!match) return
    const startIdx = upToCursor.length - match[0].length
    if (composerQuery?.trigger === ':') recordEmojiUse(insert)
    const next = `${draft.slice(0, startIdx)}${insert} ${draft.slice(cursor)}`
    setDraft(next)
    setComposerQuery(null)
    requestAnimationFrame(() => {
      el?.focus()
      const newCursor = startIdx + insert.length + 1
      el?.setSelectionRange(newCursor, newCursor)
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value
    const cursor = e.target.selectionStart
    setDraft(value)
    setComposerQuery(composerQueryAtCursor(value, cursor))
    setActiveSuggestion(0)
    notifyTyping()
  }

  const handleSend = (): void => {
    if (!outgoing || outgoing.length > MAX_LENGTH) return

    const parentId = replyTo?.id ?? null
    setDraft('')
    setComposerQuery(null)
    setReplyTo(null)
    void sendMessage(outgoing, parentId)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveSuggestion((i) => (i + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveSuggestion((i) => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        acceptSuggestion(suggestions[activeSuggestion].insert)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setComposerQuery(null)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const recipientProfile = recipientId && !isGroup ? profiles.get(recipientId) : undefined
  const recipientLabel = !recipientId
    ? ''
    : isGroup
      ? group?.name ?? 'Group'
      : profileDisplayName(recipientProfile) ?? `User #${recipientId.slice(-6)}`
  const typerProfile = typerIds[0] ? profiles.get(typerIds[0]) : undefined
  const groupOthers = (group?.member_ids ?? []).filter((id) => id !== currentUser?.id)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-transparent">
      {!recipientId ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tertiary-bg text-tertiary-text">
            <MessagesIcon className="h-8 w-8" />
          </div>
          <div>
            <p className="text-base font-semibold text-primary-text">Your Messages</p>
            <p className="mt-1 max-w-xs text-sm text-quaternary-text">
              Select a conversation from the sidebar, or search for someone there to start a new one.
            </p>
          </div>
        </div>
      ) : (
        <>
          {isGroup ? (
            <div className="flex items-center gap-2.5 border-b border-border-primary px-5 py-2.5">
              <button
                type="button"
                onClick={() => isGroupOwner && setSettingsOpen(true)}
                className={`rounded-full ${isGroupOwner ? '' : 'cursor-default'}`}
              >
                <GroupAvatar
                  groupId={recipientId}
                  memberIds={group?.member_ids ?? []}
                  fallbackIds={groupOthers.slice(0, 4)}
                  profiles={profiles}
                  className="h-8 w-8"
                />
              </button>
              <button
                type="button"
                onClick={() => isGroupOwner && setSettingsOpen(true)}
                aria-label={isGroupOwner ? 'Edit group name' : undefined}
                className={`group/name flex min-w-0 flex-1 items-center gap-2 text-left ${isGroupOwner ? '' : 'cursor-default'}`}
              >
                <span className="truncate text-sm font-semibold text-primary-text">{recipientLabel}</span>
                {isGroupOwner && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-secondary-text opacity-0 transition-opacity group-hover/name:opacity-100 hover:text-primary-text">
                        <PencilSolidIcon className="h-3.5 w-3.5" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Edit Group</TooltipContent>
                  </Tooltip>
                )}
              </button>
              {canInvite && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setInviteOpen(true)}
                      aria-label="Invite to group"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
                    >
                      <UserPlusIcon className="h-4.5 w-4.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Invite to group</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleMembers}
                    aria-label={showMembers ? 'Hide members' : 'Show members'}
                    aria-pressed={showMembers}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-quaternary-bg hover:text-primary-text ${showMembers ? 'text-primary-text' : 'text-secondary-text'}`}
                  >
                    <UsersIcon className="h-4.5 w-4.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{showMembers ? 'Hide members' : 'Show members'}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 border-b border-border-primary px-5 py-2.5">
              <UserProfilePopover userId={recipientId} profile={recipientProfile}>
                <button type="button" className="rounded-full">
                  <UserAvatarWithPresence id={recipientId} profile={recipientProfile} className="h-8 w-8" />
                </button>
              </UserProfilePopover>
              <UserProfilePopover userId={recipientId} profile={recipientProfile}>
                <button
                  type="button"
                  title={recipientId}
                  className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-primary-text hover:underline"
                >
                  {recipientLabel}
                </button>
              </UserProfilePopover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => void handleToggleBlock()}
                    aria-label={blocked ? 'Unblock user' : 'Block user'}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${blocked
                      ? 'text-status-error hover:bg-status-error/10'
                      : 'text-secondary-text hover:bg-quaternary-bg hover:text-primary-text'
                      }`}
                  >
                    <BlockIcon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{blocked ? 'Unblock' : 'Block'}</TooltipContent>
              </Tooltip>
            </div>
          )}
          <div ref={setChatRow} className="relative flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="relative min-h-0 flex-1">
                <div ref={setScrollRef} className={`absolute inset-0 overflow-y-auto pt-1 transition-[padding-bottom] duration-200 ease-out ${replyTo ? 'pb-16' : 'pb-8'}`}>
                  {hasMore && (
                    <div className="flex justify-center">
                      <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loading}>
                        {loading ? 'Loading…' : 'Load older messages'}
                      </Button>
                    </div>
                  )}

                  {error && <p className="text-center text-sm text-form-error">{error}</p>}

                  {loading && items.length === 0 && !error && (
                    <div className="flex flex-1 items-center justify-center py-10">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
                    </div>
                  )}

                  {!loading && items.length === 0 && !error && (
                    <p className="text-center text-sm text-quaternary-text">No messages yet - say hello.</p>
                  )}

                  {(() => {
                    let lastMineIndex = -1
                    if (currentUser) {
                      for (let i = items.length - 1; i >= 0; i--) {
                        if (items[i].sender_id === currentUser.id) {
                          lastMineIndex = i
                          break
                        }
                      }
                    }
                    return items.map((message, index) => {
                      const prev = items[index - 1]
                      const newDay =
                        !prev ||
                        new Date(normalizeToMs(prev.created_at)).toDateString() !==
                          new Date(normalizeToMs(message.created_at)).toDateString()
                      const showSenderInfo =
                        newDay ||
                        prev.sender_id !== message.sender_id ||
                        Boolean(prev.metadata) ||
                        Boolean(message.metadata) ||
                        normalizeToMs(message.created_at) - normalizeToMs(prev.created_at) > AVATAR_GROUP_GAP_MS
                      const senderProfile =
                        currentUser && message.sender_id === currentUser.id ? currentUser : profiles.get(message.sender_id)
                      const isMine = currentUser !== null && message.sender_id === currentUser.id
                      const canDelete = isMine || isGroupOwner
                      const parentMessage = message.parent_id
                        ? items.find((m) => m.id === message.parent_id)
                        : undefined
                      const parentSenderProfile = parentMessage
                        ? currentUser && parentMessage.sender_id === currentUser.id
                          ? currentUser
                          : profiles.get(parentMessage.sender_id)
                        : undefined
                      return (
                        <Fragment key={message.id}>
                          {newDay && (
                            <div role="separator" className="mx-5 mt-4 mb-1 flex items-center gap-2">
                              <span className="h-px flex-1 bg-border-primary" />
                              <span className="text-xs font-semibold text-tertiary-text">
                                {formatDayDivider(message.created_at)}
                              </span>
                              <span className="h-px flex-1 bg-border-primary" />
                            </div>
                          )}
                          <MessageRow
                            message={message}
                            showSenderInfo={showSenderInfo}
                            senderId={message.sender_id}
                            senderProfile={senderProfile}
                            isMine={isMine}
                            canDelete={canDelete}
                            profiles={profiles}
                            profileOf={profileOf}
                            toMentionIds={toMentionIds}
                            frequentEmojis={frequentEmojis}
                            allEmojis={allEmojis}
                            currentUserId={currentUser?.id ?? null}
                            parentMessage={parentMessage}
                            parentSenderProfile={parentSenderProfile}
                            onReply={setReplyTo}
                            onEdit={editMessage}
                            onDelete={deleteMessage}
                            onReport={reportMessage}
                            onToggleReaction={toggleReaction}
                            onRetry={retrySend}
                            onDiscard={discardFailedSend}
                            onJumpToMessage={handleJumpToMessage}
                            isHighlighted={message.id === highlightedId}
                            isReplyTarget={message.id === replyTo?.id}
                            isReplyToMe={!isMine && !!currentUser && parentMessage?.sender_id === currentUser.id}
                            registerRef={registerMessageRef}
                            showReadReceipt={index === lastMineIndex}
                          />
                        </Fragment>
                      )
                    })
                  })()}
                </div>

                <div
                  className={`pointer-events-none absolute inset-x-0 z-10 grid transition-[grid-template-rows,bottom] duration-200 ease-out ${recipientIsTyping ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    } ${replyTo ? 'bottom-[30px]' : '-bottom-0.5'}`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div
                      className={`flex items-center gap-2 bg-linear-to-t from-primary-bg from-55% to-transparent px-4 pt-4 pb-2 text-sm text-secondary-text transition-[opacity,translate] duration-200 ease-out ${recipientIsTyping ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                        }`}
                    >
                      <span className="flex h-3 shrink-0 items-center gap-[3px]">
                        <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-secondary-text [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-secondary-text [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-secondary-text" />
                      </span>
                      <UserAvatar id={typerIds[0] ?? ''} profile={typerProfile} className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {isGroup ? (
                          groupTypingLabel(typerIds, profiles)
                        ) : (
                          <>
                            <span className="font-semibold">{recipientLabel}</span> is typing…
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-20 flex flex-col justify-center border-border-primary bg-primary-bg px-2 pb-[9px]">

                <div
                  style={{
                    backgroundImage:
                      'linear-gradient(in srgb to top, var(--color-primary-bg) 35%, color-mix(in srgb, var(--color-primary-bg) 90%, transparent) 50%, color-mix(in srgb, var(--color-primary-bg) 65%, transparent) 65%, color-mix(in srgb, var(--color-primary-bg) 35%, transparent) 78%, color-mix(in srgb, var(--color-primary-bg) 12%, transparent) 90%, transparent 100%)'
                  }}
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-18"
                />

                {pendingReplyTo && (
                  <div
                    className={`absolute inset-x-2 bottom-full flex items-center gap-2 rounded-t-xl border-x border-t border-border-card bg-tertiary-bg px-3 py-1.5 transition-all duration-200 ease-out starting:translate-y-1 starting:opacity-0 ${replyTo ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                      }`}
                  >
                    <ReplyIcon className="h-3.5 w-3.5 shrink-0 -scale-x-100 text-tertiary-text" />
                    <p className="min-w-0 flex-1 truncate text-xs text-tertiary-text">
                      Replying to{' '}
                      <span className="font-semibold text-secondary-text">
                        {profileDisplayName(profileOf(pendingReplyTo.sender_id)) ?? `User #${pendingReplyTo.sender_id.slice(-6)}`}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      aria-label="Cancel reply"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-tertiary-text hover:bg-quaternary-bg hover:text-primary-text"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {outgoing.length >= MAX_LENGTH * 0.75 && (
                  <p
                    className={`mb-1 text-xs ${outgoing.length >= MAX_LENGTH * 0.95
                      ? 'text-status-error'
                      : outgoing.length >= MAX_LENGTH * 0.85
                        ? 'text-status-warning'
                        : 'text-tertiary-text'
                      }`}
                  >
                    {outgoing.length}/{MAX_LENGTH}
                  </p>
                )}

                <div className="relative">
                  {composerQuery && suggestions.length > 0 && (
                    <div className={`absolute right-0 bottom-full left-0 mb-2 overflow-hidden ${FLOATING_PANEL_SURFACE}`}>
                      <div className="border-b border-border-primary px-3 py-2 text-[10px] font-bold tracking-wide text-tertiary-text uppercase">
                        {composerQuery.trigger === '@' ? 'Members' : 'Emojis'} matching {composerQuery.trigger}
                        {composerQuery.text}
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        {suggestions.map((suggestion, index) => (
                          <button
                            key={suggestion.key}
                            type="button"
                            onMouseEnter={() => setActiveSuggestion(index)}
                            onClick={() => acceptSuggestion(suggestion.insert)}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${index === activeSuggestion ? 'bg-quaternary-bg' : ''
                              }`}
                          >
                            {suggestion.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`flex w-full min-h-[64px] items-center gap-2 rounded-xl border border-border-card bg-tertiary-bg px-1 py-2 text-primary-text transition-[border-radius] duration-200 ease-out ${pendingReplyTo ? 'rounded-t-none' : ''
                      }`}
                  >
                    {recipientId && (
                      <ComposerActionsMenu recipientId={isGroup ? null : recipientId} onSendMessage={sendMessage} />
                    )}
                    <div className="relative min-w-0 flex-1 flex">
                      <div
                        ref={draftMirrorRef}
                        aria-hidden
                        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words py-2 pl-3 pr-20 text-base leading-6 text-primary-text"
                      >
                        {splitDraftMentions(draft, mentionCandidates).map((part, i) =>
                          i % 2 === 1 ? (
                            <span
                              key={i}
                              className="rounded-[3px] bg-button-info/30 text-[color-mix(in_srgb,var(--color-button-info)_25%,white)]"
                            >
                              {part}
                            </span>
                          ) : (
                            part
                          )
                        )}
                        {'\u200b'}
                      </div>
                      <textarea
                        ref={textareaRef}
                        value={draft}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onScroll={(e) => {
                          if (draftMirrorRef.current) draftMirrorRef.current.scrollTop = e.currentTarget.scrollTop
                        }}
                        placeholder={`Message ${recipientLabel}...`}
                        rows={1}
                        maxLength={MAX_LENGTH}
                        className="relative box-border w-full resize-none overflow-y-auto border-none bg-transparent py-2 pl-3 pr-20 text-base leading-6 text-transparent caret-primary-text placeholder-secondary-text shadow-none placeholder:whitespace-nowrap focus:outline-none"
                      />
                      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                        <EmojiPicker onSelect={insertAtCursor} />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="Send message"
                              onClick={handleSend}
                              disabled={!outgoing || outgoing.length > MAX_LENGTH}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary-text transition-colors hover:bg-secondary-bg disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <SendIcon className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Send message</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {isGroup && group && showMembers && (
              <div
                className={
                  membersNarrow
                    ? 'absolute inset-y-0 right-0 z-20 flex shadow-2xl animate-in slide-in-from-right-4 fade-in-0 duration-150'
                    : 'flex'
                }
              >
                <GroupMembersSidebar
                  group={group}
                  currentUserId={currentUser?.id ?? null}
                  profiles={profiles}
                  onUpdated={onGroupUpdated}
                  onInvite={canInvite ? () => setInviteOpen(true) : null}
                />
              </div>
            )}
          </div>
        </>
      )}

      {isGroup && group && (
        <UserPickerDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          title={`Invite to ${group.name}`}
          subtitle={`Group chats can have up to ${MAX_GROUP_MEMBERS} members.`}
          confirmLabel="Invite"
          suggestedIds={suggestedUserIds}
          excludeIds={group.member_ids}
          maxSelect={MAX_GROUP_MEMBERS - group.member_ids.length}
          onConfirm={async (users) => {
            if (!token) return
            onGroupUpdated(await groupChatsApi.addMembers(token, group.id, users.map((u) => u.id)))
          }}
        />
      )}

      {isGroup && group && (
        <RenameGroupDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          group={group}
          onUpdated={onGroupUpdated}
        />
      )}

      <Dialog open={blockConfirmOpen} onOpenChange={(open) => !open && setBlockConfirmOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Block {recipientLabel}?</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4 text-sm text-secondary-text">
            They won't be able to message you until you unblock them.
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border-primary p-5">
            <Button type="button" variant="secondary" size="sm" onClick={() => setBlockConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => void confirmBlock()}>
              Block
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
