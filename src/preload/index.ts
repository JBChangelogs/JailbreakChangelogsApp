import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { UpdaterStatus } from '../main/autoUpdater'
import type { RobloxActivityEvent } from '../main/robloxGameWatcher'
import type { RichPresencePreferenceKey } from '../shared/richPresence'

const api = {
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:open-external', url),
  onProtocolUrl: (callback: (url: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, url: string): void => callback(url)
    ipcRenderer.on('protocol:url', listener)
    return () => ipcRenderer.removeListener('protocol:url', listener)
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChange: (callback: (maximized: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, maximized: boolean): void =>
        callback(maximized)
      ipcRenderer.on('window:maximized-change', listener)
      return () => ipcRenderer.removeListener('window:maximized-change', listener)
    }
  },
  auth: {
    login: (): Promise<void> => ipcRenderer.invoke('auth:login'),
    getToken: (): Promise<string | null> => ipcRenderer.invoke('auth:get-token'),
    logout: () => ipcRenderer.send('auth:logout'),
    onLoginSuccess: (callback: (token: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, token: string): void => callback(token)
      ipcRenderer.on('auth:login-success', listener)
      return () => ipcRenderer.removeListener('auth:login-success', listener)
    },
    onLoginError: (callback: (error: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, error: string): void => callback(error)
      ipcRenderer.on('auth:login-error', listener)
      return () => ipcRenderer.removeListener('auth:login-error', listener)
    }
  },
  updater: {
    quitAndInstall: () => ipcRenderer.send('updater:quit-and-install'),
    checkNow: () => ipcRenderer.send('updater:check-now'),
    onStatus: (callback: (status: UpdaterStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: UpdaterStatus): void =>
        callback(status)
      ipcRenderer.on('updater:status', listener)
      return () => ipcRenderer.removeListener('updater:status', listener)
    }
  },
  notifications: {
    show: (options: { id: string; title: string; body?: string }): Promise<void> =>
      ipcRenderer.invoke('notifications:show', options),
    onClick: (callback: (id: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, id: string): void => callback(id)
      ipcRenderer.on('notifications:clicked', listener)
      return () => ipcRenderer.removeListener('notifications:clicked', listener)
    }
  },
  onRobloxActivityChanged: (callback: (event: RobloxActivityEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, activityEvent: RobloxActivityEvent): void =>
      callback(activityEvent)
    ipcRenderer.on('roblox:activity-changed', listener)
    return () => ipcRenderer.removeListener('roblox:activity-changed', listener)
  },
  discordRpc: {
    setPreference: (key: RichPresencePreferenceKey, value: boolean) =>
      ipcRenderer.send('discord-rpc:set-preference', key, value)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
