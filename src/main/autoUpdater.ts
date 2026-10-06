import { app, BrowserWindow } from 'electron'
import electronUpdaterPkg from 'electron-updater'
const { autoUpdater: linuxAutoUpdater } = electronUpdaterPkg
import { UpdateManager, type UpdateInfo } from 'velopack'

const FEED_URL = 'https://updates.jailbreakchangelogs.com'
const CHECK_INTERVAL_MS = 30 * 60 * 1000

let windowsUpdateManager: UpdateManager | null | undefined
function getWindowsUpdateManager(): UpdateManager | null {
  if (windowsUpdateManager === undefined) {
    try {
      windowsUpdateManager = new UpdateManager(FEED_URL)
    } catch (err) {
      console.error('[autoUpdater] failed to construct UpdateManager', err)
      windowsUpdateManager = null
    }
  }
  return windowsUpdateManager
}
let pendingWindowsUpdate: UpdateInfo | null = null

export type UpdaterStatus =
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'downloading'; percent?: number }
  | { state: 'not-available' }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string }

let mainWindow: BrowserWindow | null = null

function send(status: UpdaterStatus): void {
  mainWindow?.webContents.send('updater:status', status)
}

function isWindowsUpdateCapable(): boolean {
  return process.platform === 'win32' && app.isPackaged
}

function isLinuxUpdateCapable(): boolean {
  return process.platform === 'linux' && app.isPackaged
}

let initialized = false

async function checkWindowsUpdates(): Promise<void> {
  const manager = getWindowsUpdateManager()
  if (!manager) return
  send({ state: 'checking' })
  try {
    const info = await manager.checkForUpdatesAsync()
    if (!info) {
      send({ state: 'not-available' })
      return
    }
    send({ state: 'available' })
    send({ state: 'downloading' })
    await manager.downloadUpdateAsync(info, (percent) =>
      send({ state: 'downloading', percent: Math.round(percent) })
    )
    pendingWindowsUpdate = info
    send({ state: 'downloaded', version: info.TargetFullRelease.Version })
  } catch (err) {
    console.error('[autoUpdater]', err)
  }
}

export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window

  if (isWindowsUpdateCapable()) {
    initialized = true
    return
  }

  if (isLinuxUpdateCapable()) {
    linuxAutoUpdater.autoDownload = true
    linuxAutoUpdater.autoInstallOnAppQuit = true
    linuxAutoUpdater.setFeedURL({ provider: 'generic', url: FEED_URL })
    initialized = true

    linuxAutoUpdater.on('checking-for-update', () => send({ state: 'checking' }))
    linuxAutoUpdater.on('update-available', () => send({ state: 'available' }))
    linuxAutoUpdater.on('update-not-available', () => send({ state: 'not-available' }))
    linuxAutoUpdater.on('download-progress', (progress) =>
      send({ state: 'downloading', percent: Math.round(progress.percent) })
    )
    linuxAutoUpdater.on('update-downloaded', (info) => send({ state: 'downloaded', version: info.version }))
    linuxAutoUpdater.on('error', (err) => {
      console.error('[autoUpdater]', err)
    })
  }
}

export function checkForUpdates(): void {
  if (!initialized) return
  if (isWindowsUpdateCapable()) {
    void checkWindowsUpdates()
  } else if (isLinuxUpdateCapable()) {
    linuxAutoUpdater.checkForUpdates().catch((err: unknown) => console.error('[autoUpdater] check failed', err))
  }
}

export function startAutoUpdateChecks(): void {
  if (!isWindowsUpdateCapable() && !isLinuxUpdateCapable()) return
  checkForUpdates()
  setInterval(checkForUpdates, CHECK_INTERVAL_MS)
}

export function quitAndInstall(): void {
  if (isWindowsUpdateCapable()) {
    const manager = getWindowsUpdateManager()
    if (!manager || !pendingWindowsUpdate) return
    manager.waitExitThenApplyUpdate(pendingWindowsUpdate)
    app.quit()
  } else if (isLinuxUpdateCapable()) {
    linuxAutoUpdater.quitAndInstall()
  }
}
