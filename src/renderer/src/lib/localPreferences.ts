const DESKTOP_NOTIFICATIONS_KEY = 'jbcl:desktop-notifications-enabled'
const IN_APP_NOTIFICATIONS_KEY = 'jbcl:in-app-notifications-enabled'
const LAST_TRACKER_VIEW_KEY = 'jbcl:last-tracker-view'
const LAST_SELECTED_CONVERSATION_ID_KEY = 'jbcl:last-selected-conversation-id'
const SETTINGS_PAGE_OPEN_KEY = 'jbcl:settings-page-open'
const SETTINGS_PAGE_SECTION_KEY = 'jbcl:settings-page-section'
const HIDE_JOINED_SERVERS_KEY = 'jbcl:hide-joined-servers'
const BACKGROUND_ALERTS_NOTICE_KEY = 'jbcl:background-alerts-notice'
const CLEAR_SHORTCUTS_EXPANDED_KEY = 'jbcl:clear-shortcuts-expanded'
const NAVIGATION_MODE_KEY = 'jbcl:navigation-mode'
const TABS_NOTICE_KEY = 'jbcl:tabs-notice'

function getFlag(key: string): boolean {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? true : raw === 'true'
  } catch {
    return true
  }
}

function setFlag(key: string, enabled: boolean): void {
  try {
    localStorage.setItem(key, String(enabled))
  } catch {
  }
}

export function getDesktopNotificationsEnabled(): boolean {
  return getFlag(DESKTOP_NOTIFICATIONS_KEY)
}

export function setDesktopNotificationsEnabled(enabled: boolean): void {
  setFlag(DESKTOP_NOTIFICATIONS_KEY, enabled)
}

export function getInAppNotificationsEnabled(): boolean {
  return getFlag(IN_APP_NOTIFICATIONS_KEY)
}

export function setInAppNotificationsEnabled(enabled: boolean): void {
  setFlag(IN_APP_NOTIFICATIONS_KEY, enabled)
}

export function getHideJoinedServersEnabled(): boolean {
  return getFlag(HIDE_JOINED_SERVERS_KEY)
}

export function setHideJoinedServersEnabled(enabled: boolean): void {
  setFlag(HIDE_JOINED_SERVERS_KEY, enabled)
}

export function getBackgroundAlertsNoticeVisible(): boolean {
  return getFlag(BACKGROUND_ALERTS_NOTICE_KEY)
}

export function setBackgroundAlertsNoticeVisible(visible: boolean): void {
  setFlag(BACKGROUND_ALERTS_NOTICE_KEY, visible)
}

export function getClearShortcutsExpanded(): boolean {
  return getFlag(CLEAR_SHORTCUTS_EXPANDED_KEY)
}

export function setClearShortcutsExpanded(expanded: boolean): void {
  setFlag(CLEAR_SHORTCUTS_EXPANDED_KEY, expanded)
}

export function getTabsNoticeVisible(): boolean {
  return getFlag(TABS_NOTICE_KEY)
}

export function setTabsNoticeVisible(visible: boolean): void {
  setFlag(TABS_NOTICE_KEY, visible)
}

export type NavigationMode = 'tabs' | 'simple'

export function getNavigationMode(): NavigationMode {
  try {
    return localStorage.getItem(NAVIGATION_MODE_KEY) === 'simple' ? 'simple' : 'tabs'
  } catch {
    return 'tabs'
  }
}

export function setNavigationMode(mode: NavigationMode): void {
  try {
    localStorage.setItem(NAVIGATION_MODE_KEY, mode)
  } catch {
  }
}

export function getLastTrackerView(): string | null {
  try {
    return localStorage.getItem(LAST_TRACKER_VIEW_KEY)
  } catch {
    return null
  }
}

export function setLastTrackerView(view: string): void {
  try {
    localStorage.setItem(LAST_TRACKER_VIEW_KEY, view)
  } catch {
  }
}

export function getLastSelectedConversationId(): string | null {
  try {
    return localStorage.getItem(LAST_SELECTED_CONVERSATION_ID_KEY)
  } catch {
    return null
  }
}

export function setLastSelectedConversationId(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(LAST_SELECTED_CONVERSATION_ID_KEY)
    else localStorage.setItem(LAST_SELECTED_CONVERSATION_ID_KEY, id)
  } catch {
  }
}

export function getSettingsPageOpen(): boolean {
  try {
    return localStorage.getItem(SETTINGS_PAGE_OPEN_KEY) === 'true'
  } catch {
    return false
  }
}

export function setSettingsPageOpen(open: boolean): void {
  try {
    localStorage.setItem(SETTINGS_PAGE_OPEN_KEY, String(open))
  } catch {
  }
}

export function getSettingsPageSection(): string | null {
  try {
    return localStorage.getItem(SETTINGS_PAGE_SECTION_KEY)
  } catch {
    return null
  }
}

export function setSettingsPageSection(section: string): void {
  try {
    localStorage.setItem(SETTINGS_PAGE_SECTION_KEY, section)
  } catch {
  }
}

const ACKNOWLEDGED_READS_KEY = 'jbcl:acknowledged-reads'
const ACKNOWLEDGED_READS_LIMIT = 500

function getAcknowledgedReads(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ACKNOWLEDGED_READS_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function isReadAcknowledged(messageId: string): boolean {
  return getAcknowledgedReads().includes(messageId)
}

export function acknowledgeRead(messageId: string): void {
  const ids = getAcknowledgedReads().filter((id) => id !== messageId)
  ids.push(messageId)
  try {
    localStorage.setItem(ACKNOWLEDGED_READS_KEY, JSON.stringify(ids.slice(-ACKNOWLEDGED_READS_LIMIT)))
  } catch {
  }
}
