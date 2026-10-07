import { ElectronAPI } from '@electron-toolkit/preload'
import type { UpdaterStatus } from '../main/autoUpdater'
import type { AutoScanSettings, ScannerStatus, ScanResponse } from '../shared/tradeScan'
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
  scanner: {
    status: () => Promise<ScannerStatus>
    snip: () => Promise<ScanResponse | null>
    getAuto: () => Promise<AutoScanSettings>
    setAutoEnabled: (enabled: boolean) => Promise<AutoScanSettings>
    pickAutoArea: () => Promise<AutoScanSettings>
    onAutoResult: (callback: (result: ScanResponse) => void) => () => void
  }
  analytics: {
    track: (name: string, props?: Record<string, string | number | boolean>) => void
    isEnabled: () => Promise<boolean>
    setEnabled: (enabled: boolean) => void
  }
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
