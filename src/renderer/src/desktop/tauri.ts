import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { DesktopApi } from '@shared/desktopApi'

declare global {
  interface Window {
    __JBCL_PLATFORM__?: string
  }
}

function subscribe<T>(event: string, callback: (payload: T) => void): () => void {
  const unlisten = listen<T>(event, (e) => callback(e.payload))
  return () => void unlisten.then((off) => off())
}

function fireAndForget(command: string, args?: Record<string, unknown>): void {
  invoke(command, args).catch((err) => console.error(`[desktop] ${command} failed`, err))
}

const appWindow = getCurrentWindow()

const api: DesktopApi = {
  platform: window.__JBCL_PLATFORM__ ?? 'win32',
  openExternal: (url) => invoke('open_external', { url }),
  onProtocolUrl: (callback) => subscribe('protocol:url', callback),
  window: {
    minimize: () => void appWindow.minimize(),
    toggleMaximize: () => void appWindow.toggleMaximize(),
    close: () => void appWindow.close(),
    isMaximized: () => appWindow.isMaximized(),
    onMaximizedChange: (callback) => {
      let last: boolean | null = null
      const unlisten = appWindow.onResized(async () => {
        const maximized = await appWindow.isMaximized()
        if (maximized !== last) {
          last = maximized
          callback(maximized)
        }
      })
      return () => void unlisten.then((off) => off())
    }
  },
  auth: {
    login: () => invoke('auth_login'),
    getToken: () => invoke<string | null>('auth_get_token'),
    logout: () => fireAndForget('auth_logout'),
    onLoginSuccess: (callback) => subscribe('auth:login-success', callback),
    onLoginError: (callback) => subscribe('auth:login-error', callback)
  },
  updater: {
    quitAndInstall: () => fireAndForget('updater_quit_and_install'),
    checkNow: () => fireAndForget('updater_check_now'),
    download: () => fireAndForget('updater_download'),
    onStatus: (callback) => subscribe('updater:status', callback)
  },
  robloxGameIcons: () => invoke<Record<string, string>>('roblox_game_icons'),
  notifications: {
    show: (options) => invoke('notifications_show', { options }),
    onClick: (callback) => subscribe('notifications:clicked', callback)
  },
  onRobloxActivityChanged: (callback) => subscribe('roblox:activity-changed', callback),
  scanner: {
    status: () => invoke('scanner_status'),
    install: () => invoke('scanner_install'),
    onInstallProgress: (callback) => subscribe('scanner:install-progress', callback),
    snip: () => invoke('scanner_snip'),
    getAuto: () => invoke('scanner_get_auto'),
    setAutoEnabled: (enabled) => invoke('scanner_set_auto_enabled', { enabled }),
    pickAutoArea: () => invoke('scanner_pick_auto_area'),
    onAutoResult: (callback) => subscribe('scanner:auto-result', callback)
  },
  analytics: {
    track: (name, props) => fireAndForget('analytics_track', { name, props }),
    isEnabled: () => invoke('analytics_get_enabled'),
    setEnabled: (enabled) => fireAndForget('analytics_set_enabled', { enabled })
  },
  discordRpc: {
    setPreference: (key, value) => fireAndForget('discord_set_preference', { key, value })
  },
  uninstall: {
    supported: () => invoke('app_can_uninstall'),
    run: (purge) => invoke('app_uninstall', { purge })
  }
}

function addApplicationHeader(): void {
  const originalFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (!url.startsWith('https://api.jailbreakchangelogs.com/')) return originalFetch(input, init)
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    headers.set('X-Application', 'true')
    return originalFetch(input, { ...init, headers })
  }
}

function handleShortcuts(): void {
  const isMac = api.platform === 'darwin'
  window.addEventListener('contextmenu', (e) => e.preventDefault())
  window.addEventListener(
    'keydown',
    (e) => {
      const mod = isMac ? e.metaKey : e.ctrlKey
      const devtools = e.code === 'F12' || (e.code === 'KeyI' && ((e.altKey && e.metaKey) || (e.ctrlKey && e.shiftKey)))
      if (devtools) {
        e.preventDefault()
        fireAndForget('devtools_open')
      } else if (mod && e.code === 'KeyR') {
        e.preventDefault()
        fireAndForget('app_reload')
      } else if (mod && (e.code === 'Minus' || (e.code === 'Equal' && e.shiftKey))) {
        e.preventDefault()
      }
    },
    true
  )
}

async function importElectronLocalStorage(): Promise<void> {
  try {
    const entries = await invoke<Record<string, string> | null>('legacy_local_storage')
    if (!entries) return
    for (const [key, value] of Object.entries(entries)) {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value)
    }
    await invoke('legacy_local_storage_done')
  } catch (err) {
    console.error('[desktop] could not import settings from the previous version', err)
  }
}

export async function install(): Promise<void> {
  window.api = api
  addApplicationHeader()
  handleShortcuts()
  await importElectronLocalStorage()
}
