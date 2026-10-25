import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { useConversations } from '@renderer/hooks/useConversations'
import { useGroupChats } from '@renderer/hooks/useGroupChats'
import { useNavigationHistory } from '@renderer/hooks/useNavigationHistory'
import { useSettingsPage, type SettingsSectionId } from '@renderer/contexts/SettingsPageContext'
import { parseChatKey } from '@renderer/lib/messagesApi'
import { useUnreadCount } from '@renderer/hooks/useUnreadCount'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { useMessageToasts } from '@renderer/hooks/useMessageToasts'
import { useTradeCompletedToasts } from '@renderer/hooks/useTradeCompletedToasts'
import { AccountPanel } from '@renderer/components/AccountPanel'
import { RobloxStatusBar } from '@renderer/components/RobloxStatusBar'
import { NavBar } from '@renderer/components/NavBar'
import { TabsNotice } from '@renderer/components/TabBar'
import { TabScope, useNavigationMode, useTabs, type Tab } from '@renderer/contexts/TabsContext'
import { ConversationList } from '@renderer/components/messages/ConversationList'
import { ConversationThread } from '@renderer/components/messages/ConversationThread'
import { hasBountyAlerts, hasRobberyAlerts, useTrackerAlerts } from '@renderer/lib/trackerAlerts'
import { RobberyTrackerProvider } from '@renderer/contexts/RobberyTrackerContext'
import { RobberyTrackerScreen } from '@renderer/components/robbery/RobberyTrackerScreen'
import { RobberySidebarFilters } from '@renderer/components/robbery/RobberySidebarFilters'
import { BountyTrackerProvider } from '@renderer/contexts/BountyTrackerContext'
import { BountyTrackerScreen } from '@renderer/components/bounty/BountyTrackerScreen'
import { BountySidebarFilters } from '@renderer/components/bounty/BountySidebarFilters'
import { ValuesProvider } from '@renderer/contexts/ValuesContext'
import { ValuesScreen } from '@renderer/components/values/ValuesScreen'
import { ValuesSidebarFilters } from '@renderer/components/values/ValuesSidebarFilters'
import { DupeFinderProvider } from '@renderer/contexts/DupeFinderContext'
import { CalculatorProvider } from '@renderer/contexts/CalculatorContext'
import { CalculatorScreen } from '@renderer/components/calculator/CalculatorScreen'
import { CalculatorSidebar } from '@renderer/components/calculator/CalculatorSidebar'
import { DupeFinderScreen } from '@renderer/components/dupefinder/DupeFinderScreen'
import { DupeFinderSidebar } from '@renderer/components/dupefinder/DupeFinderSidebar'
import { TradeHistoryProvider } from '@renderer/contexts/TradeHistoryContext'
import { TradeHistoryScreen } from '@renderer/components/tradehistory/TradeHistoryScreen'
import { TradeHistorySidebar } from '@renderer/components/tradehistory/TradeHistorySidebar'
import { TradesProvider } from '@renderer/contexts/TradesContext'
import { TradesScreen } from '@renderer/components/trading/TradesScreen'
import { TradesSidebar } from '@renderer/components/trading/TradesSidebar'
import type { TrackerView } from '@renderer/components/tracker/TrackerViewSwitcher'
import {
  getLastTrackerView,
  setLastTrackerView,
  getLastSelectedConversationId,
  setLastSelectedConversationId
} from '@renderer/lib/localPreferences'
import { track } from '@renderer/lib/analytics'

function isTrackerView(value: string | null): value is TrackerView {
  return value === 'robberies' || value === 'bounties'
}

export function HomeScreen(): React.JSX.Element {
  const { tabs, activeTab, activate, open, setMeta } = useTabs()
  const { mode } = useNavigationMode()
  const activeType = activeTab.type
  const [trackerView, setTrackerViewState] = useState<TrackerView>(() => {
    const stored = getLastTrackerView()
    return isTrackerView(stored) ? stored : 'robberies'
  })
  const trackerViewRef = useRef(trackerView)
  trackerViewRef.current = trackerView
  const setTrackerView = useCallback((view: TrackerView): void => {
    if (view !== trackerViewRef.current) track('tracker_view_switch', { view: view === 'robberies' ? 'robbery' : 'bounty' })
    setTrackerViewState(view)
    setLastTrackerView(view)
  }, [])
  const { setLocation } = useRealtime()
  const { conversations, loading, error, hideConversation, markConversationRead } =
    useConversations()
  const { unread, refresh: refreshUnread } = useUnreadCount()
  const { user: currentUser } = useCurrentUser()
  const [selectedId, setSelectedIdState] = useState<string | null>(() => getLastSelectedConversationId())
  const setSelectedId = useCallback((id: string | null): void => {
    setSelectedIdState(id)
    setLastSelectedConversationId(id)
  }, [])

  const selectedTarget = useMemo(() => parseChatKey(selectedId), [selectedId])
  const selectedGroupId = selectedTarget?.kind === 'group' ? selectedTarget.id : null
  const {
    groups,
    loading: groupsLoading,
    error: groupsError,
    upsertGroup,
    removeGroup,
    markGroupRead
  } = useGroupChats(activeType === 'messages' ? selectedGroupId : null)

  // Drop a selected group once it's gone (deleted, left, or removed from it).
  useEffect(() => {
    if (selectedGroupId && !groupsLoading && !groupsError && !groups.some((g) => g.id === selectedGroupId)) {
      setSelectedId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId, groups, groupsLoading, groupsError])

  const [sidebarSlot, setSidebarSlot] = useState<HTMLDivElement | null>(null)

  // Mouse back/forward step through tabs, chats and settings pages like a browser.
  const settingsPage = useSettingsPage()
  useNavigationHistory(
    {
      tab: activeTab.id,
      trackerView,
      chat: selectedId,
      settings: settingsPage.isOpen ? settingsPage.section : null
    },
    (state: { tab: string; trackerView: TrackerView; chat: string | null; settings: SettingsSectionId | null }) => {
      activate(state.tab)
      setTrackerView(state.trackerView)
      setSelectedId(state.chat)
      if (state.settings) settingsPage.open(state.settings)
      else settingsPage.close()
    }
  )

  const handleConversationRead = useCallback((): void => {
    if (!selectedTarget) return
    if (selectedTarget.kind === 'group') markGroupRead(selectedTarget.id)
    else markConversationRead(selectedTarget.id)
    refreshUnread()
  }, [selectedTarget, markGroupRead, markConversationRead, refreshUnread])

  const messagesTabId = tabs.find((tab) => tab.type === 'messages')?.id
  useEffect(() => {
    if (messagesTabId) setMeta(messagesTabId, { badge: unread })
  }, [messagesTabId, unread, setMeta])

  useMessageToasts((recipientId) => {
    open('messages')
    setSelectedId(recipientId)
  })

  useTradeCompletedToasts(() => open('tradehistory'))

  const reportedLocation = activeType === 'tracker' ? trackerView : activeType
  useEffect(() => {
    setLocation(reportedLocation)
    return () => setLocation(null)
  }, [reportedLocation, setLocation])

  const handleHide = useCallback(
    async (recipientId: string): Promise<void> => {
      if (selectedId === recipientId) setSelectedId(null)
      await hideConversation(recipientId)
    },
    [selectedId, setSelectedId, hideConversation]
  )
  const suggestedUserIds = useMemo(() => conversations.map((c) => c.recipient_id), [conversations])

  const trackerAlerts = useTrackerAlerts()
  const robberyAlertsOn = hasRobberyAlerts(trackerAlerts)
  const bountyAlertsOn = hasBountyAlerts(trackerAlerts)
  const onTracker = activeType === 'tracker'
  const openRobberyTracker = useCallback(() => {
    open('tracker')
    setTrackerView('robberies')
  }, [open, setTrackerView])
  const openBountyTracker = useCallback(() => {
    open('tracker')
    setTrackerView('bounties')
  }, [open, setTrackerView])

  const messageUser = useCallback(
    (userId: string) => {
      open('messages')
      setSelectedId(userId)
    },
    [open, setSelectedId]
  )

  const [scanTargetId, setScanTargetId] = useState<string | null>(null)
  if (activeType === 'calculator' && scanTargetId !== activeTab.id) setScanTargetId(activeTab.id)
  const autoScanTabId = tabs.some((tab) => tab.id === scanTargetId)
    ? scanTargetId
    : tabs.find((tab) => tab.type === 'calculator')?.id

  // Tabs stay mounted once opened (hidden while inactive), so switching back is instant and keeps
  // each tab's data, scroll position and filters instead of rebuilding it from scratch.
  const paneTabs = useMemo(() => [...tabs].sort((a, b) => (a.id < b.id ? -1 : 1)), [tabs])
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<string>>(() => new Set([activeTab.id]))
  if (!visitedTabs.has(activeTab.id)) setVisitedTabs(new Set(visitedTabs).add(activeTab.id))

  const renderMessages = (tab: Tab): React.ReactNode =>
    visitedTabs.has(tab.id) && (
      <Pane
        active={tab.id === activeTab.id}
        sidebarSlot={sidebarSlot}
        sidebar={
          <MemoConversationList
            conversations={conversations}
            groups={groups}
            currentUserId={currentUser?.id ?? null}
            loading={loading || groupsLoading}
            error={error ?? groupsError}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onHide={handleHide}
            onGroupCreated={upsertGroup}
            onGroupRemoved={removeGroup}
          />
        }
        main={
          // Closed while another tab is showing, so it doesn't mark new messages read.
          <MemoConversationThread
            target={tab.id === activeTab.id ? selectedTarget : null}
            group={selectedGroupId ? groups.find((g) => g.id === selectedGroupId) : undefined}
            currentUser={currentUser}
            suggestedUserIds={suggestedUserIds}
            onRead={handleConversationRead}
            onGroupUpdated={upsertGroup}
          />
        }
      />
    )

  return (
    <>
      <div className="flex h-full flex-1 min-w-0">
        <div className="flex h-full w-64 shrink-0 flex-col border-r border-border-primary bg-secondary-bg">
          {mode === 'simple' && <NavBar activeTab={activeType} onSelect={(type) => open(type)} unreadCount={unread} />}
          <div ref={setSidebarSlot} className="relative flex min-h-0 flex-1 flex-col" />
          <div className="mx-2 mt-2 mb-[9px] flex min-h-[64px] shrink-0 flex-col overflow-hidden rounded-xl border border-border-primary">
            <RobloxStatusBar />
            <div className="flex min-h-[62px] flex-1 items-center px-[11px]">
              <AccountPanel />
            </div>
          </div>
        </div>

        {/* Always mounted, so turning tracker alerts on or off doesn't rebuild every tab under them. */}
        <RobberyTrackerProvider enabled={onTracker || robberyAlertsOn} onAlertClick={openRobberyTracker}>
          <BountyTrackerProvider enabled={onTracker || bountyAlertsOn} onAlertClick={openBountyTracker}>
            <div className="relative flex h-full min-w-0 flex-1">
              {paneTabs.map((tab) => (
                <TabScope key={tab.id} id={tab.id}>
                  {tab.type === 'messages' ? (
                    renderMessages(tab)
                  ) : (
                    <TabContent
                      tab={tab}
                      active={tab.id === activeTab.id}
                      shown={visitedTabs.has(tab.id)}
                      sidebarSlot={sidebarSlot}
                      autoScan={tab.id === autoScanTabId}
                      trackerView={trackerView}
                      onChangeTrackerView={setTrackerView}
                      onMessageUser={messageUser}
                    />
                  )}
                </TabScope>
              ))}
            </div>
          </BountyTrackerProvider>
        </RobberyTrackerProvider>
      </div>
      <TabsNotice />
    </>
  )
}

const MemoConversationList = memo(ConversationList)
const MemoConversationThread = memo(ConversationThread)

// Inactive tabs skip rendering but keep their state, scroll position included (display: none can lose it).
const HIDDEN_PANE = 'pointer-events-none invisible absolute inset-0 [content-visibility:hidden]'

function Pane({
  active,
  sidebarSlot,
  sidebar,
  main
}: {
  active: boolean
  sidebarSlot: HTMLDivElement | null
  sidebar: React.ReactNode
  main: React.ReactNode
}): React.JSX.Element {
  return (
    <>
      {sidebarSlot &&
        createPortal(
          <div aria-hidden={!active} className={`flex min-h-0 flex-1 flex-col ${active ? '' : HIDDEN_PANE}`}>
            {sidebar}
          </div>,
          sidebarSlot
        )}
      <div
        aria-hidden={!active}
        className={`flex h-full min-h-0 min-w-0 flex-1 ${active ? '' : HIDDEN_PANE}`}
      >
        <DeferredMount>{main}</DeferredMount>
      </div>
    </>
  )
}

const TabContent = memo(function TabContent({
  tab,
  active,
  shown,
  sidebarSlot,
  autoScan,
  trackerView,
  onChangeTrackerView,
  onMessageUser
}: {
  tab: Tab
  active: boolean
  shown: boolean
  sidebarSlot: HTMLDivElement | null
  autoScan: boolean
  trackerView: TrackerView
  onChangeTrackerView: (view: TrackerView) => void
  onMessageUser: (userId: string) => void
}): React.JSX.Element | null {
  const pane = (sidebar: React.ReactNode, main: React.ReactNode): React.JSX.Element => (
    <Pane active={active} sidebarSlot={sidebarSlot} sidebar={sidebar} main={main} />
  )
  if (tab.type === 'calculator') {
    return (
      <CalculatorProvider autoScan={autoScan}>{shown && pane(<CalculatorSidebar />, <CalculatorScreen />)}</CalculatorProvider>
    )
  }
  if (!shown) return null
  switch (tab.type) {
    case 'tracker':
      return pane(
        trackerView === 'robberies' ? <RobberySidebarFilters /> : <BountySidebarFilters />,
        trackerView === 'robberies' ? (
          <RobberyTrackerScreen trackerView={trackerView} onChangeView={onChangeTrackerView} />
        ) : (
          <BountyTrackerScreen trackerView={trackerView} onChangeView={onChangeTrackerView} />
        )
      )
    case 'values':
      return <ValuesProvider>{pane(<ValuesSidebarFilters />, <ValuesScreen />)}</ValuesProvider>
    case 'tradehistory':
      return <TradeHistoryProvider>{pane(<TradeHistorySidebar />, <TradeHistoryScreen />)}</TradeHistoryProvider>
    case 'dupefinder':
      return <DupeFinderProvider>{pane(<DupeFinderSidebar />, <DupeFinderScreen />)}</DupeFinderProvider>
    case 'trades':
      return (
        <TradesProvider>{pane(<TradesSidebar />, <TradesScreen onMessageUser={onMessageUser} />)}</TradesProvider>
      )
    default:
      return null
  }
})

/** Paints a skeleton on a tab's first open, then mounts it on the next frame, so the tab button responds at once. */
function DeferredMount({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  if (ready) return <>{children}</>
  return (
    <div className="flex min-w-0 flex-1 flex-col" aria-busy="true">
      <div className="h-12 shrink-0 border-b border-border-primary" />
      <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] content-start gap-3 p-5">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-xl bg-secondary-bg" />
        ))}
      </div>
    </div>
  )
}
