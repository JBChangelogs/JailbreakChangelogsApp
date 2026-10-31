import type { AutoScanSettings, ScannerStatus, ScanResponse } from './tradeScan'
import type { RichPresencePreferenceKey } from './richPresence'

export type UpdateSource = 'startup' | 'poll'

export type UpdaterStatus =
  | { state: 'checking'; source?: UpdateSource }
  | { state: 'available'; source?: UpdateSource; version?: string; size?: number; notes?: string }
  | {
      state: 'downloading'
      source?: UpdateSource
      version?: string
      notes?: string
      percent?: number
      transferred?: number
      total?: number
    }
  | { state: 'not-available'; source?: UpdateSource }
  | { state: 'downloaded'; source?: UpdateSource; version: string; size?: number; notes?: string }
  | { state: 'error'; message: string }

export interface RobloxActivityEvent {
  jobId: string | null
  placeId: string | null
  game: string | null
}

export interface DesktopApi {
  platform: string
  openExternal: (url: string) => Promise<void>
  onProtocolUrl: (callback: (url: string) => void) => () => void
  takePendingProtocolUrls: () => Promise<string[]>
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
    download: () => void
    onStatus: (callback: (status: UpdaterStatus) => void) => () => void
  }
  notifications: {
    show: (options: { id: string; title: string; body?: string }) => Promise<void>
    onClick: (callback: (id: string) => void) => () => void
  }
  onRobloxActivityChanged: (callback: (event: RobloxActivityEvent) => void) => () => void
  robloxGameIcons: () => Promise<Record<string, string>>
  scanner: {
    status: () => Promise<ScannerStatus>
    install: () => Promise<ScannerStatus>
    onInstallProgress: (callback: (progress: { transferred: number; total: number }) => void) => () => void
    snip: () => Promise<ScanResponse | null>
    getAuto: () => Promise<AutoScanSettings>
    setAutoEnabled: (enabled: boolean) => Promise<AutoScanSettings>
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
  uninstall: {
    supported: () => Promise<boolean>
    run: (purge: boolean) => Promise<void>
  }
}
