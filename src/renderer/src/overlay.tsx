import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { desktopReady } from './desktop'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { RealtimeProvider } from './contexts/RealtimeContext'
import { PreferencesProvider } from './contexts/PreferencesContext'
import { SettingsPageProvider } from './contexts/SettingsPageContext'
import { TabScope, type TabType } from './contexts/TabsContext'
import { useAppAccess } from './components/AppAccessGate'
import { TAB_INFO } from './components/NavBar'
import { ToastViewport } from './components/notifications/ToastViewport'
import { ValuesProvider } from './contexts/ValuesContext'
import { ValuesScreen } from './components/values/ValuesScreen'
import { ValuesSidebarFilters } from './components/values/ValuesSidebarFilters'
import { CalculatorProvider } from './contexts/CalculatorContext'
import { CalculatorScreen } from './components/calculator/CalculatorScreen'
import { CalculatorSidebar } from './components/calculator/CalculatorSidebar'
import { TradesProvider } from './contexts/TradesContext'
import { TradesScreen } from './components/trading/TradesScreen'
import { TradesSidebar } from './components/trading/TradesSidebar'
import { DupeFinderProvider } from './contexts/DupeFinderContext'
import { DupeFinderScreen } from './components/dupefinder/DupeFinderScreen'
import { DupeFinderSidebar } from './components/dupefinder/DupeFinderSidebar'
import { TradeHistoryProvider } from './contexts/TradeHistoryContext'
import { TradeHistoryScreen } from './components/tradehistory/TradeHistoryScreen'
import { TradeHistorySidebar } from './components/tradehistory/TradeHistorySidebar'
import { RobberyTrackerProvider } from './contexts/RobberyTrackerContext'
import { BountyTrackerProvider } from './contexts/BountyTrackerContext'
import { RobberyTrackerScreen } from './components/robbery/RobberyTrackerScreen'
import { RobberySidebarFilters } from './components/robbery/RobberySidebarFilters'
import { BountyTrackerScreen } from './components/bounty/BountyTrackerScreen'
import { BountySidebarFilters } from './components/bounty/BountySidebarFilters'
import type { TrackerView } from './components/tracker/TrackerViewSwitcher'
import { PityCalculatorProvider, PityCalculatorScreen, PityCalculatorSidebar } from './components/hyperchrome/PityCalculator'
import { PrivateServersProvider, PrivateServersScreen, PrivateServersSidebar } from './components/servers/PrivateServers'
import { useItems } from './hooks/useItems'
import { getDemandColor, getItemImagePath, handleImageError, parseCashValue } from './lib/itemValueUtils'
import { prettyShortcut } from './lib/utils'
import { parseChatKey } from './lib/messagesApi'
import { useConversations } from './hooks/useConversations'
import { useGroupChats } from './hooks/useGroupChats'
import { useCurrentUser } from './hooks/useCurrentUser'
import { useUnreadCount } from './hooks/useUnreadCount'
import { ConversationList } from './components/messages/ConversationList'
import { ConversationThread } from './components/messages/ConversationThread'
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip'
import { parseTradeScan, SCAN_TUNING, type ScannedItem, type ScanResponse } from '@shared/tradeScan'
import type { Item } from '@shared/item'
import iconUrl from './assets/icon.png'
import './assets/main.css'

type Side = 'offering' | 'requesting'
type Trade = { origin: [number, number]; width: number; height: number; offering: ScannedItem[]; requesting: ScannedItem[] }
type Feature = Exclude<TabType, 'home'>
type Bounds = { x: number; y: number; w: number; h: number }
type OpenWindow = Bounds & { type: Feature; z: number; chat?: string; ready?: boolean }
type Chat = { selected: string | null; select: (id: string | null) => void }

const CARD_H = 84
const MAX_CARD_W = 184
const GAP = 10
const MARGIN = 16
const TOP_BAR = 64
const DOCK = 120
const LEAVE_AFTER_MS = 1500
const MIN_W = 420
const MIN_H = 320

const FEATURES: Feature[] = [
  'values',
  'calculator',
  'trades',
  'messages',
  'dupefinder',
  'ogfinder',
  'tradehistory',
  'tracker',
  'pity',
  'servers'
]

const PANEL = 'border border-border-primary bg-secondary-bg/90 shadow-[0_12px_32px_rgba(0,0,0,0.5)] backdrop-blur-md'

const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), Math.max(min, max))

function trackPointer(e: React.PointerEvent, onMove: (dx: number, dy: number) => void): void {
  e.preventDefault()
  const { clientX, clientY } = e
  document.documentElement.classList.add('overlay-dragging')
  const move = (ev: PointerEvent): void => onMove(ev.clientX - clientX, ev.clientY - clientY)
  const up = (): void => {
    document.documentElement.classList.remove('overlay-dragging')
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

const valueOf = (item: Item | undefined): number => Math.max(0, parseCashValue(item?.cash_value ?? null))

const signature = (t: Pick<Trade, Side>): string =>
  [t.offering, t.requesting].map((side) => side.map((s) => s.id).sort().join(',')).join('|')

function layoutRow(centers: number[], cardW: number, min: number, max: number): number[] {
  const xs = centers.map((c) => c - cardW / 2)
  for (let i = 0; i < xs.length; i++) xs[i] = Math.max(xs[i], i === 0 ? min : xs[i - 1] + cardW + GAP)
  for (let i = xs.length - 1; i >= 0; i--) xs[i] = Math.min(xs[i], i === xs.length - 1 ? max - cardW : xs[i + 1] - cardW - GAP)
  return xs
}

function useTrade(items: Item[]): { trade: Trade | null; status: string | null } {
  const [trade, setTrade] = useState<Trade | null>(null)
  const [status, setStatus] = useState<string | null>('Looking for Roblox…')
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    let pending = ''
    let leftAt: number | null = null
    const off = listen<ScanResponse>('scanner:auto-result', ({ payload }) => {
      if (!payload.ok) return setStatus(payload.message)
      if (!payload.origin || itemsRef.current.length === 0) return
      let parsed: ReturnType<typeof parseTradeScan>
      try {
        parsed = parseTradeScan(payload.detections, payload.height, itemsRef.current)
      } catch {
        return
      }
      if (!parsed.inTradeMenu) {
        leftAt ??= Date.now()
        if (Date.now() - leftAt >= LEAVE_AFTER_MS) {
          setTrade(null)
          setStatus('No trade open')
        }
        return
      }
      leftAt = null
      const max = SCAN_TUNING.maxItemsPerSide
      if (parsed.offering.length > max || parsed.requesting.length > max) return
      const sig = signature(parsed)
      if (sig !== pending) {
        pending = sig
        return
      }
      setStatus(parsed.offering.length + parsed.requesting.length === 0 ? 'The trade is empty' : null)
      setTrade({
        origin: payload.origin,
        width: payload.width,
        height: payload.height,
        offering: parsed.offering,
        requesting: parsed.requesting
      })
    })
    return () => void off.then((f) => f())
  }, [])

  return { trade, status }
}

function useWindowOrigin(): { x: number; y: number } {
  const [origin, setOrigin] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const refresh = (): void => void getCurrentWindow().outerPosition().then((p) => setOrigin({ x: p.x, y: p.y }))
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])
  return origin
}

function useClock(): { time: string; date: string } {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(id)
  }, [])
  return {
    time: now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    date: now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  }
}

function ItemCard({ item, scanned }: { item?: Item; scanned: ScannedItem }): React.JSX.Element {
  return (
    <div className={`flex h-full items-center gap-2.5 rounded-2xl p-2.5 ${PANEL}`}>
      <img
        src={getItemImagePath(scanned.type, scanned.name)}
        onError={handleImageError}
        alt=""
        className="size-12 shrink-0 rounded-xl bg-tertiary-bg object-cover"
      />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[13px] font-semibold text-primary-text">{scanned.name}</div>
        <div className="mt-0.5 truncate text-base font-bold tabular-nums text-primary-text">{item?.cash_value ?? 'N/A'}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] tabular-nums text-secondary-text">
          <span className="truncate">Duped {item?.duped_value ?? 'N/A'}</span>
          {item?.demand && <span className={`shrink-0 rounded-full px-1.5 ${getDemandColor(item.demand)}`}>{item.demand}</span>}
        </div>
      </div>
    </div>
  )
}

function TradeLayer({ byId, trade }: { byId: Map<number, Item>; trade: Trade | null }): React.JSX.Element | null {
  const win = useWindowOrigin()
  if (!trade) return null

  const dpr = window.devicePixelRatio || 1
  const toCss = (x: number, y: number): { x: number; y: number } => ({
    x: (trade.origin[0] + x - win.x) / dpr,
    y: (trade.origin[1] + y - win.y) / dpr
  })
  const frameTop = toCss(0, 0).y
  const frameBottom = toCss(0, trade.height).y
  const cardW = Math.min(MAX_CARD_W, (window.innerWidth - 2 * MARGIN - 7 * GAP) / 8)

  const placed = (['offering', 'requesting'] as const).flatMap((side) => {
    const list = trade[side]
      .map((s) => ({ s, to: toCss((s.box.x0 + s.box.x1) / 2, (s.box.y0 + s.box.y1) / 2) }))
      .sort((a, b) => a.to.x - b.to.x)
    const xs = layoutRow(list.map((p) => p.to.x), cardW, MARGIN, window.innerWidth - MARGIN)
    const top =
      side === 'offering'
        ? Math.max(TOP_BAR + GAP, frameTop - GAP - CARD_H)
        : Math.min(window.innerHeight - DOCK - GAP - CARD_H, frameBottom + GAP)
    return list.map((p, i) => ({
      ...p,
      key: `${side}-${i}-${p.s.id}`,
      card: { left: xs[i], top },
      from: { x: xs[i] + cardW / 2, y: side === 'offering' ? top + CARD_H : top }
    }))
  })

  return (
    <>
      <svg className="pointer-events-none absolute inset-0 size-full">
        {placed.map((p) => (
          <g key={p.key}>
            <line x1={p.from.x} y1={p.from.y} x2={p.to.x} y2={p.to.y} stroke="rgba(0,0,0,0.3)" strokeWidth={3.5} strokeLinecap="round" />
            <line
              x1={p.from.x}
              y1={p.from.y}
              x2={p.to.x}
              y2={p.to.y}
              stroke="var(--color-secondary-text)"
              strokeOpacity={0.7}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <circle cx={p.to.x} cy={p.to.y} r={3.5} fill="var(--color-secondary-bg)" stroke="var(--color-secondary-text)" strokeWidth={1.5} />
          </g>
        ))}
      </svg>
      {placed.map((p) => (
        <div key={p.key} className="absolute" style={{ ...p.card, width: cardW, height: CARD_H }}>
          <ItemCard item={byId.get(p.s.id)} scanned={p.s} />
        </div>
      ))}
    </>
  )
}

function TradeSummary({ byId, trade, status }: { byId: Map<number, Item>; trade: Trade | null; status: string | null }): React.JSX.Element {
  if (status || !trade) return <span className="text-sm text-secondary-text">{status}</span>
  const total = (side: Side): number => trade[side].reduce((sum, s) => sum + valueOf(byId.get(s.id)), 0)
  const giving = total('offering')
  const getting = total('requesting')
  const diff = getting - giving
  return (
    <div className="flex items-center gap-4 text-sm tabular-nums">
      <span className="text-secondary-text">
        You give <b className="text-primary-text">{giving.toLocaleString()}</b>
      </span>
      <span className="text-secondary-text">
        You get <b className="text-primary-text">{getting.toLocaleString()}</b>
      </span>
      <span
        className={`rounded-full px-2.5 py-0.5 font-semibold ${diff === 0 ? 'bg-tertiary-bg text-primary-text' : diff > 0 ? 'bg-status-success text-form-button-text' : 'bg-status-error text-form-button-text'}`}
      >
        {diff === 0 ? 'Even' : diff > 0 ? `+${diff.toLocaleString()}` : `-${(-diff).toLocaleString()}`}
      </span>
    </div>
  )
}

function Split({ sidebar, main }: { sidebar: React.ReactNode; main: React.ReactNode }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <>
      <aside
        className={`${open ? 'flex' : 'hidden'} absolute inset-y-0 left-0 z-40 w-64 max-w-[85vw] shrink-0 flex-col border-r border-border-primary bg-secondary-bg shadow-2xl md:static md:flex md:shadow-none`}
      >
        {sidebar}
      </aside>
      {open && <div className="absolute inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
      <div className="flex w-11 shrink-0 flex-col items-center border-r border-border-primary bg-secondary-bg py-2 md:hidden">
        <button
          type="button"
          aria-label="Show sidebar"
          onClick={() => setOpen(true)}
          className="flex size-8 items-center justify-center rounded-lg text-secondary-text hover:bg-tertiary-bg hover:text-primary-text"
        >
          <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
        </button>
      </div>
      <div className="flex h-full min-h-0 min-w-0 flex-1">{main}</div>
    </>
  )
}

function TrackerContent(): React.JSX.Element {
  const [view, setView] = useState<TrackerView>('robberies')
  return (
    <RobberyTrackerProvider enabled onAlertClick={() => setView('robberies')}>
      <BountyTrackerProvider enabled onAlertClick={() => setView('bounties')}>
        {view === 'robberies' ? (
          <Split sidebar={<RobberySidebarFilters />} main={<RobberyTrackerScreen trackerView={view} onChangeView={setView} />} />
        ) : (
          <Split sidebar={<BountySidebarFilters />} main={<BountyTrackerScreen trackerView={view} onChangeView={setView} />} />
        )}
      </BountyTrackerProvider>
    </RobberyTrackerProvider>
  )
}

function MessagesContent({ chat }: { chat: Chat }): React.JSX.Element {
  const { conversations, loading, error, hideConversation, markConversationRead } = useConversations()
  const { refresh: refreshUnread } = useUnreadCount()
  const { user: currentUser } = useCurrentUser()
  const target = useMemo(() => parseChatKey(chat.selected), [chat.selected])
  const groupId = target?.kind === 'group' ? target.id : null
  const { groups, loading: groupsLoading, error: groupsError, upsertGroup, removeGroup, markGroupRead } = useGroupChats(groupId)
  const suggestedUserIds = useMemo(() => conversations.map((c) => c.recipient_id), [conversations])

  const onRead = useCallback((): void => {
    if (!target) return
    if (target.kind === 'group') markGroupRead(target.id)
    else markConversationRead(target.id)
    refreshUnread()
  }, [target, markGroupRead, markConversationRead, refreshUnread])

  const onHide = async (recipientId: string): Promise<void> => {
    if (chat.selected === recipientId) chat.select(null)
    await hideConversation(recipientId)
  }

  return (
    <Split
      sidebar={
        <ConversationList
          conversations={conversations}
          groups={groups}
          currentUserId={currentUser?.id ?? null}
          loading={loading || groupsLoading}
          error={error ?? groupsError}
          selectedId={chat.selected}
          onSelect={chat.select}
          onHide={onHide}
          onGroupCreated={upsertGroup}
          onGroupRemoved={removeGroup}
        />
      }
      main={
        <ConversationThread
          target={target}
          group={groupId ? groups.find((g) => g.id === groupId) : undefined}
          currentUser={currentUser}
          suggestedUserIds={suggestedUserIds}
          onRead={onRead}
          onGroupUpdated={upsertGroup}
        />
      }
    />
  )
}

function FeatureContent({ type, chat, onMessageUser }: { type: Feature; chat: Chat; onMessageUser: (userId: string) => void }): React.JSX.Element {
  switch (type) {
    case 'values':
      return <ValuesProvider><Split sidebar={<ValuesSidebarFilters />} main={<ValuesScreen />} /></ValuesProvider>
    case 'calculator':
      return <CalculatorProvider autoScan><Split sidebar={<CalculatorSidebar />} main={<CalculatorScreen />} /></CalculatorProvider>
    case 'trades':
      return <TradesProvider><Split sidebar={<TradesSidebar />} main={<TradesScreen onMessageUser={onMessageUser} />} /></TradesProvider>
    case 'messages':
      return <MessagesContent chat={chat} />
    case 'dupefinder':
      return <DupeFinderProvider><Split sidebar={<DupeFinderSidebar />} main={<DupeFinderScreen />} /></DupeFinderProvider>
    case 'ogfinder':
      return <DupeFinderProvider mode="og"><Split sidebar={<DupeFinderSidebar />} main={<DupeFinderScreen />} /></DupeFinderProvider>
    case 'tradehistory':
      return <TradeHistoryProvider><Split sidebar={<TradeHistorySidebar />} main={<TradeHistoryScreen />} /></TradeHistoryProvider>
    case 'tracker':
      return <TrackerContent />
    case 'pity':
      return <PityCalculatorProvider><Split sidebar={<PityCalculatorSidebar />} main={<PityCalculatorScreen />} /></PityCalculatorProvider>
    case 'servers':
      return <PrivateServersProvider><Split sidebar={<PrivateServersSidebar />} main={<PrivateServersScreen />} /></PrivateServersProvider>
  }
}

const RESIZE_HANDLES: [string, string][] = [
  ['n', 'inset-x-4 -top-1 h-2 cursor-ns-resize'],
  ['s', 'inset-x-4 -bottom-1 h-2 cursor-ns-resize'],
  ['e', 'inset-y-4 -right-1 w-2 cursor-ew-resize'],
  ['w', 'inset-y-4 -left-1 w-2 cursor-ew-resize'],
  ['nw', '-top-1 -left-1 size-5 cursor-nwse-resize'],
  ['ne', '-top-1 -right-1 size-5 cursor-nesw-resize'],
  ['sw', '-bottom-1 -left-1 size-5 cursor-nesw-resize'],
  ['se', '-right-1 -bottom-1 size-5 cursor-nwse-resize']
]

function FloatingWindow({
  win,
  children,
  onFocus,
  onChange,
  onClose
}: {
  win: OpenWindow
  children: React.ReactNode
  onFocus: () => void
  onChange: (bounds: Bounds) => void
  onClose: () => void
}): React.JSX.Element {
  const { title, Icon } = TAB_INFO[win.type]
  const startDrag = (e: React.PointerEvent): void => {
    if ((e.target as HTMLElement).closest('button')) return
    trackPointer(e, (dx, dy) =>
      onChange({
        ...win,
        x: clamp(win.x + dx, 80 - win.w, window.innerWidth - 80),
        y: clamp(win.y + dy, TOP_BAR, window.innerHeight - DOCK - 40)
      })
    )
  }
  const startResize = (edges: string) => (e: React.PointerEvent) =>
    trackPointer(e, (dx, dy) => {
      const right = win.x + win.w
      const bottom = win.y + win.h
      const next = { ...win }
      if (edges.includes('e')) next.w = clamp(win.w + dx, MIN_W, window.innerWidth - win.x)
      if (edges.includes('s')) next.h = clamp(win.h + dy, MIN_H, window.innerHeight - DOCK - win.y)
      if (edges.includes('w')) {
        next.x = clamp(win.x + dx, 0, right - MIN_W)
        next.w = right - next.x
      }
      if (edges.includes('n')) {
        next.y = clamp(win.y + dy, TOP_BAR, bottom - MIN_H)
        next.h = bottom - next.y
      }
      onChange(next)
    })
  return (
    <div
      onPointerDownCapture={onFocus}
      className="absolute flex flex-col rounded-2xl border border-border-primary bg-primary-bg shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
      style={{ left: win.x, top: win.y, zIndex: win.z, width: win.w, height: win.h }}
    >
      <div
        onPointerDown={startDrag}
        className="flex h-10 shrink-0 cursor-grab items-center gap-2 rounded-t-2xl border-b border-border-primary bg-secondary-bg px-3 text-sm font-semibold text-primary-text active:cursor-grabbing"
      >
        <span className="flex size-5 items-center justify-center text-secondary-text [&_svg]:size-4">
          <Icon />
        </span>
        {title}
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="ml-auto flex size-7 items-center justify-center rounded-lg text-secondary-text hover:bg-status-error hover:text-form-button-text"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-b-2xl">{children}</div>
      {RESIZE_HANDLES.map(([edges, className]) => (
        <div key={edges} onPointerDown={startResize(edges)} className={`absolute ${className}`} />
      ))}
    </div>
  )
}

function Dock({ open, unread, onOpen }: { open: Feature[]; unread: number; onOpen: (type: Feature) => void }): React.JSX.Element {
  return (
    <div className={`absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-3xl p-2.5 ${PANEL}`}>
      {FEATURES.map((type) => {
        const { label, Icon } = TAB_INFO[type]
        const active = open.includes(type)
        const badge = type === 'messages' ? unread : 0
        return (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={active ? `Close ${label}` : label}
                onClick={() => onOpen(type)}
                className={`relative flex size-12 items-center justify-center rounded-2xl transition-[background-color,color,transform] hover:-translate-y-0.5 [&_svg]:size-6 ${active ? 'bg-quaternary-bg text-primary-text' : 'text-secondary-text hover:bg-tertiary-bg hover:text-primary-text'}`}
              >
                <Icon />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-card-tag-bg px-1 text-[9px] font-semibold text-card-tag-text">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
                {active && <span className="absolute -bottom-1.5 size-1 rounded-full bg-button-info" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={12}>
              {active ? `Close ${label}` : label}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

function Keys({ shortcut }: { shortcut: string }): React.JSX.Element {
  return (
    <span className="inline-flex gap-1">
      {prettyShortcut(shortcut)
        .split(' + ')
        .map((key) => (
          <kbd key={key} className="rounded-md border border-border-primary bg-tertiary-bg px-1.5 py-0.5 font-sans text-[11px] text-primary-text">
            {key}
          </kbd>
        ))}
    </span>
  )
}

function Overlay(): React.JSX.Element {
  const { status: authStatus, token } = useAuth()
  const signedIn = authStatus === 'authenticated'
  const { access } = useAppAccess(signedIn ? token : null)
  const { items } = useItems()
  const byId = new Map(items.map((i) => [i.id, i]))
  const { trade, status } = useTrade(items)
  const { time, date } = useClock()
  const { unread } = useUnreadCount()
  const [shortcut, setShortcut] = useState<string | null>(null)
  const [windows, setWindows] = useState<OpenWindow[]>([])
  const topZ = windows.reduce((max, w) => Math.max(max, w.z), 0)

  useEffect(() => {
    const refresh = (): void => void window.api.overlay.getShortcut().then(setShortcut)
    refresh()
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  useEscapeToClose()

  const focus = (type: Feature): void =>
    setWindows((ws) => ws.map((w) => (w.type === type && w.z !== topZ ? { ...w, z: topZ + 1 } : w)))

  const openFeature = (type: Feature): void => {
    if (windows.some((w) => w.type === type)) return focus(type)
    const w = Math.min(1040, window.innerWidth * 0.75)
    const h = Math.max(MIN_H, Math.min(680, window.innerHeight - TOP_BAR - DOCK - 48))
    const offset = (windows.length % 6) * 28
    setWindows((ws) => [...ws, { type, x: (window.innerWidth - w) / 2 + offset, y: TOP_BAR + 16 + offset, w, h, z: topZ + 1 }])
  }

  const toggleFeature = (type: Feature): void => {
    if (windows.some((w) => w.type === type)) setWindows((ws) => ws.filter((w) => w.type !== type))
    else openFeature(type)
  }

  const messageUser = (userId: string): void => {
    if (!windows.some((w) => w.type === 'messages')) openFeature('messages')
    setWindows((ws) =>
      ws.map((w) => (w.type === 'messages' ? { ...w, chat: userId, ready: w.chat === userId && w.ready, z: topZ + 1 } : w))
    )
  }

  useEffect(() => {
    const onMessage = (e: MessageEvent): void => {
      if (e.origin !== location.origin) return
      const data = e.data as { kind?: string; feature?: Feature; userId?: string }
      if (data.kind === 'overlay:focus' && data.feature) focus(data.feature)
      if (data.kind === 'overlay:message-user' && data.userId) messageUser(data.userId)
      if (data.kind === 'overlay:ready' && data.feature)
        setWindows((ws) => ws.map((w) => (w.type === data.feature ? { ...w, ready: true } : w)))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  })

  const hasAccess = signedIn && access === 'granted'

  return (
    <div className="fixed inset-0 bg-black/55 font-sans text-primary-text">
      <TradeLayer byId={byId} trade={trade} />

      <div className={`absolute inset-x-4 top-4 flex h-12 items-center gap-4 rounded-2xl px-4 ${PANEL}`}>
        <div className="flex items-center gap-2.5">
          <img src={iconUrl} alt="" className="size-7 rounded-full" />
          <span className="text-sm font-semibold">Jailbreak Changelogs</span>
        </div>
        <div className="flex flex-1 justify-center">
          <TradeSummary byId={byId} trade={trade} status={status} />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="text-sm font-semibold tabular-nums">{time}</div>
            <div className="text-[11px] text-secondary-text">{date}</div>
          </div>
          <div className="h-7 w-px bg-border-primary" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Close overlay"
                onClick={() => void invoke('overlay_hide')}
                className="flex size-8 items-center justify-center rounded-xl text-secondary-text hover:bg-tertiary-bg hover:text-primary-text"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="flex items-center gap-2">
              Close {shortcut && <Keys shortcut={shortcut} />}
              <Keys shortcut="Esc" />
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {hasAccess ? (
        <>
          {windows.map((w) => (
            <FloatingWindow
              key={w.type}
              win={w}
              onFocus={() => focus(w.type)}
              onChange={(bounds) => setWindows((ws) => ws.map((o) => (o.type === w.type ? { ...o, ...bounds } : o)))}
              onClose={() => setWindows((ws) => ws.filter((o) => o.type !== w.type))}
            >
              {!w.ready && (
                <span className="absolute top-1/2 left-1/2 size-6 -translate-1/2 animate-spin rounded-full border-2 border-border-primary border-t-button-info" />
              )}
              <iframe
                key={w.chat ?? ''}
                title={TAB_INFO[w.type].title}
                src={`overlay.html?feature=${w.type}${w.chat ? `&chat=${encodeURIComponent(w.chat)}` : ''}`}
                className={`size-full border-0 transition-opacity duration-150 ${w.ready ? '' : 'opacity-0'}`}
              />
            </FloatingWindow>
          ))}
          <Dock open={windows.map((w) => w.type)} unread={unread} onOpen={toggleFeature} />
        </>
      ) : (
        authStatus !== 'checking' &&
        (!signedIn || access !== 'checking') && (
          <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm text-secondary-text ${PANEL}`}>
            Sign in to Jailbreak Changelogs to use the rest of the overlay.
          </div>
        )
      )}
      <ToastViewport />
    </div>
  )
}

function useEscapeToClose(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('[role="dialog"]')) void invoke('overlay_hide')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function FrameApp({ type, initialChat }: { type: Feature; initialChat: string | null }): React.JSX.Element {
  const [selected, select] = useState(initialChat)
  useEscapeToClose()
  useEffect(() => {
    const raise = (): void => window.parent.postMessage({ kind: 'overlay:focus', feature: type }, location.origin)
    window.addEventListener('pointerdown', raise, true)
    return () => window.removeEventListener('pointerdown', raise, true)
  }, [type])
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      window.parent.postMessage({ kind: 'overlay:ready', feature: type }, location.origin)
    )
    return () => cancelAnimationFrame(frame)
  }, [type])
  const messageUser = (userId: string): void =>
    window.parent.postMessage({ kind: 'overlay:message-user', userId }, location.origin)
  return (
    <div className="relative flex h-screen overflow-hidden bg-primary-bg font-sans text-primary-text">
      <TabScope id={`overlay-${type}`}>
        <FeatureContent type={type} chat={{ selected, select }} onMessageUser={messageUser} />
      </TabScope>
      <ToastViewport />
    </div>
  )
}

const params = new URLSearchParams(location.search)
const frameFeature = FEATURES.find((f) => f === params.get('feature'))

void desktopReady.then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <RealtimeProvider>
            <PreferencesProvider>
              <SettingsPageProvider>
                {frameFeature ? <FrameApp type={frameFeature} initialChat={params.get('chat')} /> : <Overlay />}
              </SettingsPageProvider>
            </PreferencesProvider>
          </RealtimeProvider>
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
  )
})
