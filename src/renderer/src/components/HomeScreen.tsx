import { Fragment, useCallback, useEffect, useState } from 'react'
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
import { AccountPanel } from '@renderer/components/AccountPanel'
import { RobloxStatusBar } from '@renderer/components/RobloxStatusBar'
import { NavBar, type HomeTab } from '@renderer/components/NavBar'
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
import { TradesProvider } from '@renderer/contexts/TradesContext'
import { TradesScreen } from '@renderer/components/trading/TradesScreen'
import { TradesSidebar } from '@renderer/components/trading/TradesSidebar'
import type { TrackerView } from '@renderer/components/tracker/TrackerViewSwitcher'
import {
  getLastActiveTab,
  setLastActiveTab,
  getLastTrackerView,
  setLastTrackerView,
  getLastSelectedConversationId,
  setLastSelectedConversationId
} from '@renderer/lib/localPreferences'
import { track } from '@renderer/lib/analytics'

const VALID_TABS: readonly string[] = [
  'messages',
  'tracker',
  'values',
  'calculator',
  'trades',
  'dupefinder',
] satisfies HomeTab[]

function isHomeTab(value: string | null): value is HomeTab {
  return value !== null && VALID_TABS.includes(value)
}

function isTrackerView(value: string | null): value is TrackerView {
  return value === 'robberies' || value === 'bounties'
}

export function HomeScreen(): React.JSX.Element {
  const [activeTab, setActiveTabState] = useState<HomeTab>(() => {
    const stored = getLastActiveTab()
    return isHomeTab(stored) ? stored : 'messages'
  })
  const setActiveTab = (tab: HomeTab): void => {
    if (tab !== activeTab) track('tab_view', { tab, prev_tab: activeTab })
    setActiveTabState(tab)
    setLastActiveTab(tab)
  }
  const [trackerView, setTrackerViewState] = useState<TrackerView>(() => {
    const stored = getLastTrackerView()
    return isTrackerView(stored) ? stored : 'robberies'
  })
  const setTrackerView = (view: TrackerView): void => {
    if (view !== trackerView) track('tracker_view_switch', { view: view === 'robberies' ? 'robbery' : 'bounty' })
    setTrackerViewState(view)
    setLastTrackerView(view)
  }
  const { setLocation } = useRealtime()
  const { conversations, loading, error, hideConversation, unhideConversation, markConversationRead } =
    useConversations()
  const { unread, refresh: refreshUnread } = useUnreadCount()
  const { user: currentUser } = useCurrentUser()
  const [selectedId, setSelectedIdState] = useState<string | null>(() => getLastSelectedConversationId())
  const setSelectedId = (id: string | null): void => {
    setSelectedIdState(id)
    setLastSelectedConversationId(id)
  }

  const selectedTarget = parseChatKey(selectedId)
  const selectedGroupId = selectedTarget?.kind === 'group' ? selectedTarget.id : null
  const {
    groups,
    loading: groupsLoading,
    error: groupsError,
    upsertGroup,
    removeGroup,
    markGroupRead
  } = useGroupChats(activeTab === 'messages' ? selectedGroupId : null)

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
      tab: activeTab,
      trackerView,
      chat: selectedId,
      settings: settingsPage.isOpen ? settingsPage.section : null
    },
    (state: { tab: HomeTab; trackerView: TrackerView; chat: string | null; settings: SettingsSectionId | null }) => {
      setActiveTab(state.tab)
      setTrackerView(state.trackerView)
      setSelectedId(state.chat)
      if (state.settings) settingsPage.open(state.settings)
      else settingsPage.close()
    }
  )

  const handleConversationRead = (): void => {
    if (!selectedTarget) return
    if (selectedTarget.kind === 'group') markGroupRead(selectedTarget.id)
    else markConversationRead(selectedTarget.id)
    refreshUnread()
  }

  useMessageToasts((recipientId) => {
    setActiveTab('messages')
    setSelectedId(recipientId)
  })

  const reportedLocation = activeTab === 'tracker' ? trackerView : activeTab
  useEffect(() => {
    setLocation(reportedLocation)
    return () => setLocation(null)
  }, [reportedLocation, setLocation])

  const handleHide = async (recipientId: string): Promise<void> => {
    if (selectedId === recipientId) setSelectedId(null)
    await hideConversation(recipientId)
  }

  const trackerAlerts = useTrackerAlerts()
  const robberyAlertsOn = hasRobberyAlerts(trackerAlerts)
  const bountyAlertsOn = hasBountyAlerts(trackerAlerts)
  const onTracker = activeTab === 'tracker'
  const openRobberyTracker = useCallback(() => {
    setActiveTab('tracker')
    setTrackerView('robberies')
  }, [])
  const openBountyTracker = useCallback(() => {
    setActiveTab('tracker')
    setTrackerView('bounties')
  }, [])

  // Tabs stay mounted once opened (hidden while inactive), so switching back is instant and keeps
  // each tab's data, scroll position and filters instead of rebuilding it from scratch.
  const [visitedTabs, setVisitedTabs] = useState<ReadonlySet<HomeTab>>(() => new Set([activeTab]))
  if (!visitedTabs.has(activeTab)) setVisitedTabs(new Set(visitedTabs).add(activeTab))

  // Inactive tabs skip rendering but keep their state, scroll position included (display: none can lose it).
  const HIDDEN_PANE = 'pointer-events-none invisible absolute inset-0 [content-visibility:hidden]'
  const pane = (tab: HomeTab, sidebar: React.ReactNode, main: React.ReactNode): React.ReactNode => {
    const active = tab === activeTab
    return (
      <Fragment key={tab}>
        {sidebarSlot &&
          createPortal(
            <div aria-hidden={!active} className={`flex min-h-0 flex-1 flex-col ${active ? '' : HIDDEN_PANE}`}>
              {sidebar}
            </div>,
            sidebarSlot
          )}
        <div aria-hidden={!active} className={`flex h-full min-h-0 min-w-0 flex-1 ${active ? '' : HIDDEN_PANE}`}>
          <DeferredMount>{main}</DeferredMount>
        </div>
      </Fragment>
    )
  }

  const tabs = (
    <>
      {visitedTabs.has('messages') &&
        pane(
          'messages',
          <ConversationList
            conversations={conversations}
            groups={groups}
            currentUserId={currentUser?.id ?? null}
            loading={loading || groupsLoading}
            error={error ?? groupsError}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onHide={handleHide}
            onUnhide={unhideConversation}
            onGroupCreated={upsertGroup}
            onGroupRemoved={removeGroup}
          />,
          // Closed while another tab is showing, so it doesn't mark new messages read.
          <ConversationThread
            target={activeTab === 'messages' ? selectedTarget : null}
            group={selectedGroupId ? groups.find((g) => g.id === selectedGroupId) : undefined}
            currentUser={currentUser}
            suggestedUserIds={conversations.map((c) => c.recipient_id)}
            onRead={handleConversationRead}
            onGroupUpdated={upsertGroup}
          />
        )}
      {visitedTabs.has('tracker') &&
        pane(
          'tracker',
          trackerView === 'robberies' ? <RobberySidebarFilters /> : <BountySidebarFilters />,
          trackerView === 'robberies' ? (
            <RobberyTrackerScreen trackerView={trackerView} onChangeView={setTrackerView} />
          ) : (
            <BountyTrackerScreen trackerView={trackerView} onChangeView={setTrackerView} />
          )
        )}
      {visitedTabs.has('values') && (
        <ValuesProvider>{pane('values', <ValuesSidebarFilters />, <ValuesScreen />)}</ValuesProvider>
      )}
      {visitedTabs.has('calculator') && pane('calculator', <CalculatorSidebar />, <CalculatorScreen />)}
      {visitedTabs.has('dupefinder') && (
        <DupeFinderProvider>{pane('dupefinder', <DupeFinderSidebar />, <DupeFinderScreen />)}</DupeFinderProvider>
      )}
      {visitedTabs.has('trades') && (
        <TradesProvider>
          {pane(
            'trades',
            <TradesSidebar />,
            <TradesScreen
              onMessageUser={(userId) => {
                setActiveTab('messages')
                setSelectedId(userId)
              }}
            />
          )}
        </TradesProvider>
      )}
    </>
  )

  return (
    <CalculatorProvider>
      <div className="flex h-full flex-1 min-w-0">
        <div className="flex h-full w-64 shrink-0 flex-col border-r border-border-primary bg-secondary-bg">
          <NavBar activeTab={activeTab} onSelect={setActiveTab} unreadCount={unread} />
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
            <div className="relative flex h-full min-w-0 flex-1">{tabs}</div>
          </BountyTrackerProvider>
        </RobberyTrackerProvider>
      </div>
    </CalculatorProvider>
  )
}

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
