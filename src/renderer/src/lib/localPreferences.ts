const DESKTOP_NOTIFICATIONS_KEY = 'jbcl:desktop-notifications-enabled'
const IN_APP_NOTIFICATIONS_KEY = 'jbcl:in-app-notifications-enabled'
const LAST_ACTIVE_TAB_KEY = 'jbcl:last-active-tab'
const LAST_TRACKER_VIEW_KEY = 'jbcl:last-tracker-view'
const LAST_SELECTED_ITEM_ID_KEY = 'jbcl:last-selected-item-id'
const LAST_SELECTED_CONVERSATION_ID_KEY = 'jbcl:last-selected-conversation-id'
const SETTINGS_PAGE_OPEN_KEY = 'jbcl:settings-page-open'
const SETTINGS_PAGE_SECTION_KEY = 'jbcl:settings-page-section'
const HIDE_JOINED_SERVERS_KEY = 'jbcl:hide-joined-servers'

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

export function getLastActiveTab(): string | null {
  try {
    return localStorage.getItem(LAST_ACTIVE_TAB_KEY)
  } catch {
    return null
  }
}

export function setLastActiveTab(tab: string): void {
  try {
    localStorage.setItem(LAST_ACTIVE_TAB_KEY, tab)
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

export function getLastSelectedItemId(): number | null {
  try {
    const raw = localStorage.getItem(LAST_SELECTED_ITEM_ID_KEY)
    if (raw === null) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function setLastSelectedItemId(id: number | null): void {
  try {
    if (id === null) localStorage.removeItem(LAST_SELECTED_ITEM_ID_KEY)
    else localStorage.setItem(LAST_SELECTED_ITEM_ID_KEY, String(id))
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
