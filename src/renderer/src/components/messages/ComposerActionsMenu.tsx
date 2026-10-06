import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useOwnRobloxActivity } from '@renderer/hooks/useOwnRobloxActivity'
import { serversApi } from '@renderer/lib/serversApi'
import { giftsApi } from '@renderer/lib/giftsApi'
import { supporterBadgeUrl } from '@renderer/lib/badgeAssets'
import { KNOWN_ROBLOX_GAMES } from '@shared/robloxGames'
import type { OutgoingMessageMetadata } from '@renderer/lib/messagesApi'
import type { VipServer } from '@shared/servers'
import type { SupporterGift } from '@shared/gifts'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'

function PlusIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

function ChevronRightIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  )
}

const TIER_LABELS: Record<number, string> = {
  1: 'Supporter One',
  2: 'Supporter Two',
  3: 'Supporter Three'
}

function tierLabel(level: number): string {
  return TIER_LABELS[level] ?? `Supporter ${level}`
}

interface FlyoutMenuItemProps {
  icon: React.ReactNode
  label: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function FlyoutMenuItem({ icon, label, open, onOpenChange, children }: FlyoutMenuItemProps): React.JSX.Element {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-primary-text transition-colors hover:bg-quaternary-bg"
        >
          {icon}
          <span className="flex-1">{label}</span>
          <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-tertiary-text" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" sideOffset={8} className="w-64 p-1">
        {children}
      </PopoverContent>
    </Popover>
  )
}

interface VipServerFlyoutContentProps {
  servers: VipServer[] | null
  error: string | null
  onConfirm: (server: VipServer) => void
}

function VipServerFlyoutContent({ servers, error, onConfirm }: VipServerFlyoutContentProps): React.JSX.Element {
  return (
    <div className="max-h-72 overflow-y-auto">
      <p className="px-2.5 py-1.5 text-xs font-bold tracking-wide text-quaternary-text uppercase">Your VIP Servers</p>
      {error && <p className="px-2.5 py-1.5 text-xs text-form-error">{error}</p>}
      {!error && servers === null && <p className="px-2.5 py-1.5 text-xs text-quaternary-text">Loading…</p>}
      {servers?.length === 0 && (
        <p className="px-2.5 py-1.5 text-xs text-quaternary-text">
          You don't own any VIP servers yet. Add one on the website first.
        </p>
      )}
      {servers?.map((server) => (
        <button
          key={server.id}
          type="button"
          onClick={() => onConfirm(server)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-quaternary-bg"
        >
          <ServerIcon className="h-4.5 w-4.5 shrink-0 text-tertiary-text" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-primary-text">Server #{server.id}</span>
            {server.rules && <span className="block truncate text-xs text-quaternary-text">{server.rules}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}

interface GiftGroup {
  level: number
  gifts: SupporterGift[]
}

interface GiftFlyoutContentProps {
  gifts: SupporterGift[] | null
  error: string | null
  onSend: (gift: SupporterGift) => Promise<void>
  onGiftUsed: (shareId: string) => void
}

function GiftFlyoutContent({ gifts, error: loadError, onSend, onGiftUsed }: GiftFlyoutContentProps): React.JSX.Element {
  const [sendingLevel, setSendingLevel] = useState<number | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  const groups = useMemo<GiftGroup[]>(() => {
    const byLevel = new Map<number, SupporterGift[]>()
    for (const gift of gifts ?? []) {
      const list = byLevel.get(gift.level) ?? []
      list.push(gift)
      byLevel.set(gift.level, list)
    }
    return [...byLevel.entries()].sort((a, b) => a[0] - b[0]).map(([level, list]) => ({ level, gifts: list }))
  }, [gifts])

  const handleSend = async (group: GiftGroup): Promise<void> => {
    const gift = group.gifts[0]
    setSendingLevel(group.level)
    setSendError(null)
    try {
      await onSend(gift)
      onGiftUsed(gift.share_id)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send gift')
    } finally {
      setSendingLevel(null)
    }
  }

  const error = loadError ?? sendError

  return (
    <div className="max-h-72 overflow-y-auto">
      <p className="px-2.5 py-1.5 text-xs font-bold tracking-wide text-quaternary-text uppercase">Your Gifts</p>
      {error && <p className="px-2.5 py-1.5 text-xs text-form-error">{error}</p>}
      {!loadError && gifts === null && <p className="px-2.5 py-1.5 text-xs text-quaternary-text">Loading…</p>}
      {groups.length === 0 && gifts !== null && (
        <p className="px-2.5 py-1.5 text-xs text-quaternary-text">You don't have any unredeemed gifts to send.</p>
      )}
      {groups.map((group) => (
        <button
          key={group.level}
          type="button"
          disabled={sendingLevel !== null}
          onClick={() => void handleSend(group)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-quaternary-bg disabled:opacity-50"
        >
          <img src={supporterBadgeUrl(group.level)} alt="" className="h-4.5 w-4.5 shrink-0 object-contain" />
          <span className="min-w-0 flex-1 truncate text-sm text-primary-text">{tierLabel(group.level)} Gift</span>
          {sendingLevel === group.level ? (
            <span className="shrink-0 text-xs text-quaternary-text">Sending…</span>
          ) : (
            group.gifts.length > 1 && (
              <span className="shrink-0 text-xs text-quaternary-text">×{group.gifts.length}</span>
            )
          )}
        </button>
      ))}
    </div>
  )
}

interface ComposerActionsMenuProps {
  recipientId: string
  onSendMessage: (content: string, parentId: string | null, metadata?: OutgoingMessageMetadata) => Promise<void>
}

export function ComposerActionsMenu({ recipientId, onSendMessage }: ComposerActionsMenuProps): React.JSX.Element {
  const { token } = useAuth()
  const ownActivity = useOwnRobloxActivity()
  const [menuOpen, setMenuOpen] = useState(false)
  const [vipOpen, setVipOpen] = useState(false)
  const [giftOpen, setGiftOpen] = useState(false)

  const [servers, setServers] = useState<VipServer[] | null>(null)
  const [serversError, setServersError] = useState<string | null>(null)
  const [gifts, setGifts] = useState<SupporterGift[] | null>(null)
  const [giftsError, setGiftsError] = useState<string | null>(null)

  useEffect(() => {
    if (!menuOpen || !token) return
    if (servers === null) {
      serversApi
        .listMine(token)
        .then(setServers)
        .catch((err: unknown) => setServersError(err instanceof Error ? err.message : 'Failed to load servers'))
    }
    if (gifts === null) {
      giftsApi
        .list(token)
        .then(setGifts)
        .catch((err: unknown) => setGiftsError(err instanceof Error ? err.message : 'Failed to load gifts'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen, token])

  const canInviteToGame = ownActivity.placeId !== null

  const handleInviteToGame = (): void => {
    if (!ownActivity.placeId) return
    const gameName = KNOWN_ROBLOX_GAMES[ownActivity.placeId] ?? 'my game'
    setMenuOpen(false)
    void onSendMessage(`Join me in ${gameName}!`, null, {
      type: 'game_invite',
      place_id: ownActivity.placeId,
      job_id: ownActivity.jobId
    })
  }

  const handleSendVipServer = (server: VipServer): void => {
    setVipOpen(false)
    setMenuOpen(false)
    void onSendMessage(server.rules.trim() || "Here's my VIP server.", null, {
      type: 'vip_server_invite',
      server_id: server.id
    })
  }

  const handleSendGift = async (gift: SupporterGift): Promise<void> => {
    if (!token) return
    await giftsApi.redeem(token, gift.share_id, recipientId)
  }

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="More options"
              className="ml-2.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
            >
              <PlusIcon className="h-6 w-6" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">More options</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" side="top" className="w-64 p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled={!canInviteToGame}
              onClick={handleInviteToGame}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-primary-text transition-colors hover:bg-quaternary-bg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <GameControllerIcon className="h-4.5 w-4.5 shrink-0 text-tertiary-text" />
              Invite to Game
            </button>
          </TooltipTrigger>
          {!canInviteToGame && <TooltipContent side="right">You're not in a game right now</TooltipContent>}
        </Tooltip>

        <FlyoutMenuItem
          icon={<ServerIcon className="h-4.5 w-4.5 shrink-0 text-tertiary-text" />}
          label="Send VIP Server"
          open={vipOpen}
          onOpenChange={setVipOpen}
        >
          <VipServerFlyoutContent servers={servers} error={serversError} onConfirm={handleSendVipServer} />
        </FlyoutMenuItem>

        <FlyoutMenuItem
          icon={<GiftIcon className="h-4.5 w-4.5 shrink-0 text-tertiary-text" />}
          label="Send Gift"
          open={giftOpen}
          onOpenChange={setGiftOpen}
        >
          <GiftFlyoutContent
            gifts={gifts}
            error={giftsError}
            onSend={handleSendGift}
            onGiftUsed={(shareId) => setGifts((prev) => (prev ? prev.filter((g) => g.share_id !== shareId) : prev))}
          />
        </FlyoutMenuItem>
      </PopoverContent>
    </Popover>
  )
}
