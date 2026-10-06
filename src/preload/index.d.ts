import { ElectronAPI } from '@electron-toolkit/preload'
import type { UpdaterStatus } from '../main/autoUpdater'
import type { RobloxActivityEvent } from '../main/robloxGameWatcher'
import type { RichPresencePreferenceKey } from '../shared/richPresence'

interface DesktopApi {
  openExternal: (url: string) => Promise<void>
  onProtocolUrl: (callback: (url: string) => void) => () => void
  window: {
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
    onMaximizedChange: (callback: (maximized: boolean) => void) => () => void
  }
  auth: {
    login: () => Promise<void>
    getToken: () => Promise<string | null>
    logout: () => void
    onLoginSuccess: (callback: (token: string) => void) => () => void
    onLoginError: (callback: (error: string) => void) => () => void
  }
  updater: {
    quitAndInstall: () => void
    checkNow: () => void
    onStatus: (callback: (status: UpdaterStatus) => void) => () => void
  }
  notifications: {
    show: (options: { id: string; title: string; body?: string }) => Promise<void>
    onClick: (callback: (id: string) => void) => () => void
  }
  onRobloxActivityChanged: (callback: (event: RobloxActivityEvent) => void) => () => void
  discordRpc: {
    setPreference: (key: RichPresencePreferenceKey, value: boolean) => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: DesktopApi
  }
}
