import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { MessagesIcon } from '@renderer/components/NavBar'
import { useConversation, type DisplayMessage } from '@renderer/hooks/useConversation'
import { useBlockedUsers } from '@renderer/hooks/useBlockedUsers'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { useUserProfiles } from '@renderer/hooks/useUserProfiles'
import { useEmojis } from '@renderer/hooks/useEmojis'
import {
  formatMessageTimestamp,
  formatTimeOnly,
  describeMetadata,
  normalizeToMs
} from '@renderer/lib/messageFormatting'
import { EmojiPicker } from '@renderer/components/messages/EmojiPicker'
import { Emoji, EmojiText } from '@renderer/components/messages/Emoji'
import { UserAvatar, UserAvatarWithPresence } from '@renderer/components/messages/UserAvatar'
import { UserNameSkeleton } from '@renderer/components/messages/UserNameSkeleton'
import { UserProfilePopover } from '@renderer/components/user/UserProfilePopover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@renderer/components/ui/context-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { ComposerActionsMenu } from '@renderer/components/messages/ComposerActionsMenu'
import { serversApi } from '@renderer/lib/serversApi'
import { buildRobloxGameDeepLink } from '@renderer/lib/robberyUtils'
import { FLOATING_PANEL_SURFACE } from '@renderer/lib/floatingPanelSurface'
import type { MessageItem } from '@renderer/lib/messagesApi'
import { useAuth } from '@renderer/contexts/AuthContext'
import { tradesApi } from '@renderer/lib/tradesApi'
import { ItemSide } from '@renderer/components/trading/TradeAdDetailScreen'
import type { TradeOffer } from '@shared/trading'
import type { UserProfile } from '@shared/user'
import type { VipServerWithOwner } from '@shared/servers'

const AVATAR_GROUP_GAP_MS = 5 * 60 * 1000

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

function ReplyCornerIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 56 12" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9V2h34" />
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
    <Button type="button" size="sm" onClick={() => void window.api.openExternal(server.link)}>
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
  const accentClass = metaType === 'gift_sent' ? 'bg-status-success-vibrant' : 'bg-status-info'
  const iconClass = metaType === 'gift_sent' ? 'text-status-success-vibrant' : 'text-status-info'

  return (
    <div className="relative max-w-md overflow-hidden rounded-2xl bg-secondary-bg py-2 pr-3 pl-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${accentClass}`} />
      <p className={`flex items-center gap-1.5 text-sm font-semibold  ${iconClass}`}>
        {icon}
        {title}
      </p>
      <p className="mt-0.5 text-sm text-secondary-text">{description}</p>
      {metaType === 'game_invite' && typeof metadata.place_id === 'string' && (
        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            onClick={() =>
              void window.api.openExternal(
                buildRobloxGameDeepLink(
                  metadata.place_id as string,
                  typeof metadata.job_id === 'string' ? metadata.job_id : null
                )
              )
            }
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
            Join Game
          </Button>
        </div>
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

function MessageActionsMenu({
  isMine,
  onReply,
  onEdit,
  onDelete,
  onReport
}: {
  isMine: boolean
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
              className={`flex h-7 w-7 border border-border-primary bg-secondary-bg items-center justify-center rounded-md text-secondary-text opacity-0 transition-opacity group-hover:opacity-100 hover:bg-quaternary-bg hover:text-primary-text ${open ? 'opacity-100' : ''}`}
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
        {isMine
          ? [
            item('edit', <EditIcon className="h-4 w-4" />, 'Edit', onEdit, false),
            item('delete', <DeleteIcon className="h-4 w-4" />, 'Delete', onDelete, true)
          ]
          : item('report', <ReportIcon className="h-4 w-4" />, 'Report', onReport, true)}
      </PopoverContent>
    </Popover>
  )
}

function MessageRow({
  message,
  showSenderInfo,
  senderId,
  senderProfile,
  isMine,
  parentMessage,
  parentSenderProfile,
  onReply,
  onEdit,
  onDelete,
  onReport,
  onRetry,
  onDiscard,
  onJumpToMessage,
  isHighlighted,
  registerRef,
  showReadReceipt
}: {
  message: DisplayMessage
  showSenderInfo: boolean
  senderId: string
  senderProfile?: UserProfile
  isMine: boolean
  parentMessage?: MessageItem
  parentSenderProfile?: UserProfile
  onReply: (message: MessageItem) => void
  onEdit: (messageId: string, content: string) => Promise<void>
  onDelete: (messageId: string) => Promise<void>
  onReport: (messageId: string, reason: string) => Promise<void>
  onRetry: (localId: string) => void
  onDiscard: (localId: string) => void
  onJumpToMessage: (messageId: string) => void
  isHighlighted: boolean
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
    if (!isRead) {
      setShowReadFlash(false)
      return
    }
    setReadIndicatorMounted(true)
    setShowReadFlash(true)
    const timeout = setTimeout(() => setShowReadFlash(false), READ_RECEIPT_FLASH_MS)
    return () => clearTimeout(timeout)
  }, [isRead])
  const isFailed = message.status === 'failed'

  if (message.metadata) {
    const metadata = message.metadata
    const metaType = metadata.type

    if (metaType === 'offer_accepted' && typeof metadata.trade === 'number') {
      return (
        <div className="group rounded px-5 py-1.5 pt-1 hover:bg-secondary-bg/60">
          <OfferAcceptedCard
            message={message}
            tradeId={metadata.trade}
            offerId={typeof metadata.offer === 'number' ? metadata.offer : null}
          />
        </div>
      )
    }

    if (metaType === 'game_invite' || metaType === 'vip_server_invite' || metaType === 'gift_sent') {
      return (
        <div className="group rounded px-5 py-1.5 pt-1 hover:bg-secondary-bg/60">
          <SystemEmbedCard
            message={message}
            metadata={metadata}
            isMine={isMine}
            senderLabel={senderProfile?.username || senderProfile?.name || `User #${senderId.slice(-6)}`}
          />
        </div>
      )
    }

    return (
      <div className="group flex items-center gap-3 rounded px-5 py-1.5 hover:bg-secondary-bg/60">
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

  const label = senderProfile?.username || senderProfile?.name
  const parentLabel = parentSenderProfile?.username || parentSenderProfile?.name

  const saveEdit = async (): Promise<void> => {
    const content = editDraft.trim()
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
      className={`group rounded px-5 transition-colors duration-150 hover:bg-secondary-bg/60 ${showSenderInfo || message.parent_id ? 'mt-2 pt-1' : ''
        } ${isHighlighted ? 'bg-status-info/15' : isContextMenuOpen ? 'bg-secondary-bg/60' : ''}`}
    >
      {message.parent_id && (
        <div className="flex items-center">
          <ReplyCornerIcon className="h-3 w-14 shrink-0 text-tertiary-text" />
          <button
            type="button"
            onClick={() => parentMessage && onJumpToMessage(parentMessage.id)}
            disabled={!parentMessage}
            className="flex min-w-0 flex-1 items-center gap-1 text-left text-xs text-tertiary-text disabled:cursor-default hover:enabled:text-secondary-text"
          >
            {parentMessage ? (
              <>
                <UserAvatar id={parentMessage.sender_id} profile={parentSenderProfile} className="h-4 w-4 shrink-0" />
                {parentLabel ? (
                  <span className="shrink-0 font-medium text-secondary-text">{parentLabel}</span>
                ) : (
                  <UserNameSkeleton className="w-14" />
                )}
                <span className="min-w-0 truncate">{parentMessage.content || '(a message)'}</span>
              </>
            ) : (
              <span>Replying to a message</span>
            )}
          </button>
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
            <span className="hidden pt-0.5 text-[10px] whitespace-nowrap text-quaternary-text group-hover:block">
              {formatTimeOnly(message.created_at)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {(showSenderInfo || parentMessage) && (
            <div className="flex items-baseline gap-2">
              <UserProfilePopover userId={senderId} profile={senderProfile}>
                <button type="button" className="min-w-0 truncate text-left text-base font-semibold text-primary-text hover:underline">
                  {label}
                </button>
              </UserProfilePopover>
              <span className="shrink-0 text-xs text-tertiary-text">
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
            <div className="space-y-1.5">
              <textarea
                autoFocus
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void saveEdit()
                  } else if (e.key === 'Escape') {
                    setIsEditing(false)
                    setEditDraft(message.content)
                  }
                }}
                rows={1}
                maxLength={MAX_LENGTH}
                className="box-border w-full resize-none rounded-xl border border-border-focus bg-form-input px-2 py-1.5 text-base leading-6 text-primary-text outline-none"
              />
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
                className={`text-base whitespace-pre-wrap break-words ${isFailed
                  ? 'text-status-error'
                  : isPending
                    ? 'text-primary-text/50'
                    : 'text-primary-text/90'
                  }`}
              >
                <EmojiText text={message.content} />
                {message.updated_at != null && message.updated_at > message.created_at && (
                  <span className="ml-1 text-xs text-quaternary-text">(edited)</span>
                )}
              </p>
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

        {canShowActions && (
          <div className="absolute top-0 right-2 -translate-y-1/2">
            <MessageActionsMenu
              isMine={isMine}
              onReply={() => onReply(message)}
              onEdit={() => setIsEditing(true)}
              onDelete={handleDelete}
              onReport={handleReport}
            />
          </div>
        )}
      </div>
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
        <div className="flex shrink-0 justify-end gap-2 border-t border-border-primary px-5 py-4">
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
        <div className="flex shrink-0 justify-end gap-2 border-t border-border-primary px-5 py-4">
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
        <ContextMenuContent className="w-40">
          <ContextMenuItem onClick={() => onReply(message)}>
            <ReplyIcon className="h-4 w-4" />
            Reply
          </ContextMenuItem>
          {isMine ? (
            <>
              <ContextMenuItem onClick={() => setIsEditing(true)}>
                <EditIcon className="h-4 w-4" />
                Edit
              </ContextMenuItem>
              <ContextMenuItem destructive onClick={handleDelete}>
                <DeleteIcon className="h-4 w-4" />
                Delete
              </ContextMenuItem>
            </>
          ) : (
            <ContextMenuItem destructive onClick={handleReport}>
              <ReportIcon className="h-4 w-4" />
              Report
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {reportDialog}
      {deleteDialog}
    </>
  )
}

function emojiQueryAtCursor(text: string, cursor: number): string | null {
  const upToCursor = text.slice(0, cursor)
  const match = upToCursor.match(/(?:^|\s):([a-z0-9_]{0,20})$/i)
  return match ? match[1] : null
}

interface ConversationThreadProps {
  recipientId: string | null
  currentUser: UserProfile | null
  onRead?: () => void
}

export function ConversationThread({
  recipientId,
  currentUser,
  onRead
}: ConversationThreadProps): React.JSX.Element {
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
    notifyTyping
  } = useConversation(recipientId, currentUser?.id ?? null, onRead)
  const { typingUserIds } = useRealtime()
  const recipientIsTyping = recipientId !== null && typingUserIds.has(recipientId)
  const profiles = useUserProfiles(recipientId ? [recipientId] : [])
  const { isBlocked, block, unblock } = useBlockedUsers()
  const blocked = recipientId !== null && isBlocked(recipientId)
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

  const [draft, setDraft] = useState('')
  const [emojiQuery, setEmojiQuery] = useState<string | null>(null)
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

  const suggestions =
    emojiQuery !== null
      ? Object.entries(emojis)
        .filter(([name]) => name.toLowerCase().startsWith(emojiQuery.toLowerCase()))
        .slice(0, 8)
      : []

  useEffect(() => {
    if (recipientId !== prevRecipientRef.current) {
      prevRecipientRef.current = recipientId
      return
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [items, recipientId])

  useEffect(() => {
    if (!scrollNode) return
    const observer = new ResizeObserver(() => {
      scrollNode.scrollTop = scrollNode.scrollHeight
    })
    observer.observe(scrollNode)
    return () => observer.disconnect()
  }, [scrollNode])

  const [isScrolledUp, setIsScrolledUp] = useState(false)
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

  useEffect(() => {
    setReplyTo(null)
  }, [recipientId])

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

  const acceptSuggestion = (emoji: string): void => {
    const el = textareaRef.current
    const cursor = el?.selectionStart ?? draft.length
    const upToCursor = draft.slice(0, cursor)
    const match = upToCursor.match(/:([a-z0-9_]{0,20})$/i)
    if (!match) return
    const startIdx = upToCursor.length - match[0].length
    const next = `${draft.slice(0, startIdx)}${emoji} ${draft.slice(cursor)}`
    setDraft(next)
    setEmojiQuery(null)
    requestAnimationFrame(() => {
      el?.focus()
      const newCursor = startIdx + emoji.length + 1
      el?.setSelectionRange(newCursor, newCursor)
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value
    const cursor = e.target.selectionStart
    setDraft(value)
    setEmojiQuery(emojiQueryAtCursor(value, cursor))
    setActiveSuggestion(0)
    notifyTyping()
  }

  const handleSend = (): void => {
    const content = draft.trim()
    if (!content || content.length > MAX_LENGTH) return

    const parentId = replyTo?.id ?? null
    setDraft('')
    setEmojiQuery(null)
    setReplyTo(null)
    void sendMessage(content, parentId)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (emojiQuery !== null && suggestions.length > 0) {
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
        const [, emoji] = suggestions[activeSuggestion]
        acceptSuggestion(emoji)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setEmojiQuery(null)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const recipientProfile = recipientId ? profiles.get(recipientId) : undefined
  const recipientLabel = recipientId
    ? recipientProfile?.username || recipientProfile?.name || `User #${recipientId.slice(-6)}`
    : ''

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
          <div className="relative min-h-0 flex-1">
            <div ref={setScrollRef} className="absolute inset-0 overflow-y-auto pt-1 pb-5">
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
                  const showSenderInfo =
                    !prev ||
                    prev.sender_id !== message.sender_id ||
                    Boolean(prev.metadata) ||
                    Boolean(message.metadata) ||
                    normalizeToMs(message.created_at) - normalizeToMs(prev.created_at) > AVATAR_GROUP_GAP_MS
                  const senderProfile =
                    currentUser && message.sender_id === currentUser.id ? currentUser : profiles.get(message.sender_id)
                  const isMine = currentUser !== null && message.sender_id === currentUser.id
                  const parentMessage = message.parent_id
                    ? items.find((m) => m.id === message.parent_id)
                    : undefined
                  const parentSenderProfile = parentMessage
                    ? currentUser && parentMessage.sender_id === currentUser.id
                      ? currentUser
                      : profiles.get(parentMessage.sender_id)
                    : undefined
                  return (
                    <MessageRow
                      key={message.id}
                      message={message}
                      showSenderInfo={showSenderInfo}
                      senderId={message.sender_id}
                      senderProfile={senderProfile}
                      isMine={isMine}
                      parentMessage={parentMessage}
                      parentSenderProfile={parentSenderProfile}
                      onReply={setReplyTo}
                      onEdit={editMessage}
                      onDelete={deleteMessage}
                      onReport={reportMessage}
                      onRetry={retrySend}
                      onDiscard={discardFailedSend}
                      onJumpToMessage={handleJumpToMessage}
                      isHighlighted={message.id === highlightedId}
                      registerRef={registerMessageRef}
                      showReadReceipt={index === lastMineIndex}
                    />
                  )
                })
              })()}
            </div>

            <div
              className={`pointer-events-none absolute inset-x-0 z-10 grid transition-[grid-template-rows,bottom] duration-200 ease-out ${recipientIsTyping ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                } ${pendingReplyTo ? 'bottom-8' : 'bottom-0'}`}
            >
              <div className="flex items-center gap-2 overflow-hidden px-4 text-xs text-tertiary-text">
                <span className="flex h-3 shrink-0 items-center gap-[2px]">
                  <span className="h-1 w-1 animate-typing-dot rounded-full bg-tertiary-text [animation-delay:-0.3s]" />
                  <span className="h-1 w-1 animate-typing-dot rounded-full bg-tertiary-text [animation-delay:-0.15s]" />
                  <span className="h-1 w-1 animate-typing-dot rounded-full bg-tertiary-text" />
                </span>
                <UserAvatar id={recipientId ?? ''} profile={recipientProfile} className="h-4 w-4 shrink-0" />
                <span className="truncate py-1.5">
                  <span className="font-semibold text-secondary-text">{recipientLabel}</span> is typing…
                </span>
              </div>
            </div>
          </div>

          <div className="relative flex flex-col justify-center border-border-primary bg-primary-bg px-2 pb-2">

            <div
              style={{
                backgroundImage:
                  'linear-gradient(in srgb to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0.9) 50%, rgba(0,0,0,0.65) 65%, rgba(0,0,0,0.35) 78%, rgba(0,0,0,0.12) 90%, rgba(0,0,0,0) 100%)'
              }}
              className={`pointer-events-none absolute inset-x-0 bottom-0 transition-[height] duration-300 ease-in-out ${isScrolledUp && recipientIsTyping ? (pendingReplyTo ? 'h-40' : 'h-28') : 'h-18'
                }`}
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
                    {(currentUser && pendingReplyTo.sender_id === currentUser.id
                      ? currentUser
                      : profiles.get(pendingReplyTo.sender_id)
                    )?.username || `User #${pendingReplyTo.sender_id.slice(-6)}`}
                  </span>
                  {pendingReplyTo.content && (
                    <>
                      : <EmojiText text={pendingReplyTo.content} />
                    </>
                  )}
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
            {draft.length >= MAX_LENGTH * 0.75 && (
              <p
                className={`mb-1 text-xs ${draft.length >= MAX_LENGTH * 0.95
                  ? 'text-status-error'
                  : draft.length >= MAX_LENGTH * 0.85
                    ? 'text-status-warning'
                    : 'text-tertiary-text'
                  }`}
              >
                {draft.length}/{MAX_LENGTH}
              </p>
            )}

            <div className="relative">
              {emojiQuery !== null && suggestions.length > 0 && (
                <div className={`absolute right-0 bottom-full left-0 mb-2 overflow-hidden ${FLOATING_PANEL_SURFACE}`}>
                  <div className="border-b border-border-primary px-3 py-2 text-[10px] font-bold tracking-wide text-tertiary-text uppercase">
                    Emojis matching :{emojiQuery}
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1">
                    {suggestions.map(([name, emoji], index) => (
                      <button
                        key={name}
                        type="button"
                        onMouseEnter={() => setActiveSuggestion(index)}
                        onClick={() => acceptSuggestion(emoji)}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${index === activeSuggestion ? 'bg-quaternary-bg' : ''
                          }`}
                      >
                        <span className="text-lg">
                          <Emoji emoji={emoji} />
                        </span>
                        <span className="text-primary-text">:{name}:</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={`focus-within:border-border-focus flex w-full min-h-[64px] items-center gap-2 rounded-xl border border-border-card bg-tertiary-bg px-1 py-2 text-primary-text transition-[border-radius] duration-200 ease-out ${pendingReplyTo ? 'rounded-t-none' : ''
                  }`}
              >
                {recipientId && <ComposerActionsMenu recipientId={recipientId} onSendMessage={sendMessage} />}
                <div className="relative min-w-0 flex-1 flex">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${recipientLabel}...`}
                    rows={1}
                    maxLength={MAX_LENGTH}
                    className="box-border w-full resize-none overflow-y-auto border-none bg-transparent py-2 pl-3 pr-20 text-base leading-6 text-primary-text placeholder-secondary-text shadow-none placeholder:whitespace-nowrap focus:outline-none"
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    <EmojiPicker onSelect={insertAtCursor} />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Send message"
                          onClick={handleSend}
                          disabled={!draft.trim() || draft.length > MAX_LENGTH}
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
        </>
      )}

      <Dialog open={blockConfirmOpen} onOpenChange={(open) => !open && setBlockConfirmOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Block {recipientLabel}?</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4 text-sm text-secondary-text">
            They won't be able to message you until you unblock them.
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border-primary px-5 py-4">
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
