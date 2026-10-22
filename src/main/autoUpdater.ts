import { app, BrowserWindow } from 'electron'
import electronUpdaterPkg from 'electron-updater'
const { autoUpdater: linuxAutoUpdater } = electronUpdaterPkg
import { UpdateManager, type UpdateInfo } from 'velopack'
import {
  downloadMigration,
  findMigration,
  installMigration,
  isMigrationCapable,
  migrationBlocked,
  type FoundMigration,
  type MigrationTarget
} from './tauriMigration'

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

export type { UpdaterStatus } from '../shared/desktopApi'
import type { UpdaterStatus, UpdateSource } from '../shared/desktopApi'

let mainWindow: BrowserWindow | null = null

function send(status: UpdaterStatus): void {
  mainWindow?.webContents.send('updater:status', status)
}

function progressStatus(
  source: UpdateSource,
  version: string,
  notes: string | undefined,
  transferred: number,
  total: number
): UpdaterStatus {
  const percent = total ? Math.min(100, Math.round((transferred / total) * 1000) / 10) : undefined
  return { state: 'downloading', source, version, notes, percent, transferred, total }
}

function isWindowsUpdateCapable(): boolean {
  return process.platform === 'win32' && app.isPackaged
}

function isLinuxUpdateCapable(): boolean {
  return process.platform === 'linux' && app.isPackaged
}

function isMacUpdateCapable(): boolean {
  return process.platform === 'darwin' && app.isPackaged
}

// a > b for "x.y.z" versions.
function isNewerVersion(a: string, b: string): boolean {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  }
  return false
}

// The Mac build is unsigned, so it can't update itself; point the user at the new DMG instead.
async function checkMacUpdates(): Promise<void> {
  try {
    const res = await fetch(`${FEED_URL}/latest-mac.json`, { cache: 'no-store' })
    if (!res.ok) return
    const { version, url } = (await res.json()) as { version: string; url: string }
    if (isNewerVersion(version, app.getVersion())) send({ state: 'manual', version, url })
  } catch (err) {
    console.error('[autoUpdater] mac check failed', err)
  }
}

let initialized = false
let linuxSource: UpdateSource = 'startup'
let pendingMigration: MigrationTarget | null = null
let availableMigration: FoundMigration | null = null
let availableWindowsUpdate: UpdateInfo | null = null
let migrating = false

const MANUAL_DOWNLOAD_URL =
  process.platform === 'win32'
    ? 'https://updates.jailbreakchangelogs.com/JBCLSetup.exe'
    : 'https://updates.jailbreakchangelogs.com/JBCLSetup.AppImage'

async function checkMigration(source: UpdateSource): Promise<boolean> {
  if (pendingMigration) {
    const { version, size, notes } = pendingMigration
    send({ state: 'downloaded', source, version, size, notes })
    return true
  }
  if (migrating) return true
  let found: Awaited<ReturnType<typeof findMigration>> = null
  try {
    found = await findMigration()
  } catch (err) {
    console.error('[migration] check failed', err)
  }
  if (!found) return false
  if (migrationBlocked()) {
    send({ state: 'manual', version: found.version, url: MANUAL_DOWNLOAD_URL })
    return true
  }
  send({ state: 'available', source, version: found.version, notes: found.notes })
  if (source === 'startup') await downloadMigrationUpdate(found, source)
  else availableMigration = found
  return true
}

async function downloadMigrationUpdate(found: FoundMigration, source: UpdateSource): Promise<void> {
  migrating = true
  const { version, notes } = found
  send({ state: 'downloading', source, version, notes })
  try {
    pendingMigration = await downloadMigration(found, (transferred, total) =>
      send(progressStatus(source, version, notes, transferred, total))
    )
    send({ state: 'downloaded', source, version, size: pendingMigration.size, notes })
  } catch (err) {
    console.error('[migration] download failed', err)
    send({ state: 'not-available', source })
  } finally {
    migrating = false
  }
}

async function checkWindowsUpdates(source: UpdateSource): Promise<void> {
  const manager = getWindowsUpdateManager()
  if (!manager) return
  if (pendingWindowsUpdate) {
    const { Version: version, Size: size, NotesMarkdown: notes } = pendingWindowsUpdate.TargetFullRelease
    send({ state: 'downloaded', source, version, size, notes: notes || undefined })
    return
  }
  send({ state: 'checking', source })
  try {
    const info = await manager.checkForUpdatesAsync()
    if (!info) {
      send({ state: 'not-available', source })
      return
    }
    const { Version: version, Size: size, NotesMarkdown } = info.TargetFullRelease
    send({ state: 'available', source, version, size, notes: NotesMarkdown || undefined })
    if (source === 'startup') await downloadWindowsUpdate(manager, info, source)
    else availableWindowsUpdate = info
  } catch (err) {
    console.error('[autoUpdater]', err)
    send({ state: 'not-available', source })
  }
}

async function downloadWindowsUpdate(manager: UpdateManager, info: UpdateInfo, source: UpdateSource): Promise<void> {
  const { Version: version, Size: size, NotesMarkdown } = info.TargetFullRelease
  const notes = NotesMarkdown || undefined
  send({ state: 'downloading', source, version, notes })
  try {
    await manager.downloadUpdateAsync(info, (percent) =>
      send(progressStatus(source, version, notes, Math.round((size * percent) / 100), size))
    )
    pendingWindowsUpdate = info
    send({ state: 'downloaded', source, version, size, notes })
  } catch (err) {
    console.error('[autoUpdater]', err)
    send({ state: 'not-available', source })
  }
}

export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window

  if (isWindowsUpdateCapable() || isMacUpdateCapable()) {
    initialized = true
    return
  }

  if (isLinuxUpdateCapable()) {
    linuxAutoUpdater.autoDownload = false
    linuxAutoUpdater.autoInstallOnAppQuit = true
    linuxAutoUpdater.setFeedURL({ provider: 'generic', url: FEED_URL })
    initialized = true

    let linuxVersion = ''
    let linuxNotes: string | undefined
    const notesOf = (info: { releaseNotes?: unknown }): string | undefined =>
      typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined
    linuxAutoUpdater.on('checking-for-update', () => send({ state: 'checking', source: linuxSource }))
    linuxAutoUpdater.on('update-available', (info) => {
      linuxVersion = info.version
      linuxNotes = notesOf(info)
      send({ state: 'available', source: linuxSource, version: linuxVersion, notes: linuxNotes })
      if (linuxSource === 'startup') void downloadLinuxUpdate()
    })
    linuxAutoUpdater.on('update-not-available', () => send({ state: 'not-available', source: linuxSource }))
    linuxAutoUpdater.on('download-progress', (progress) =>
      send(progressStatus(linuxSource, linuxVersion, linuxNotes, progress.transferred, progress.total))
    )
    linuxAutoUpdater.on('update-downloaded', (info) =>
      send({ state: 'downloaded', source: linuxSource, version: info.version, notes: notesOf(info) })
    )
    linuxAutoUpdater.on('error', (err) => {
      console.error('[autoUpdater]', err)
      send({ state: 'not-available', source: linuxSource })
    })
  }
}

export function checkForUpdates(source: UpdateSource = 'poll'): void {
  if (!initialized) return
  if (isMigrationCapable()) {
    void checkMigration(source).then((handled) => {
      if (!handled) checkElectronUpdates(source)
    })
    return
  }
  checkElectronUpdates(source)
}

function checkElectronUpdates(source: UpdateSource): void {
  if (isWindowsUpdateCapable()) {
    void checkWindowsUpdates(source)
  } else if (isMacUpdateCapable()) {
    void checkMacUpdates()
  } else if (isLinuxUpdateCapable()) {
    linuxSource = source
    linuxAutoUpdater.checkForUpdates().catch((err: unknown) => console.error('[autoUpdater] check failed', err))
  }
}

export function startAutoUpdateChecks(): void {
  if (!isWindowsUpdateCapable() && !isLinuxUpdateCapable() && !isMacUpdateCapable()) return
  checkForUpdates('startup')
  setInterval(() => checkForUpdates('poll'), CHECK_INTERVAL_MS)
}

function downloadLinuxUpdate(): Promise<void> {
  send({ state: 'downloading', source: linuxSource })
  return linuxAutoUpdater
    .downloadUpdate()
    .then(() => undefined)
    .catch((err: unknown) => {
      console.error('[autoUpdater] download failed', err)
      send({ state: 'error', message: "The update couldn't be downloaded." })
    })
}

export function downloadUpdate(): void {
  if (availableMigration) {
    const found = availableMigration
    availableMigration = null
    void downloadMigrationUpdate(found, 'poll')
  } else if (availableWindowsUpdate) {
    const manager = getWindowsUpdateManager()
    const info = availableWindowsUpdate
    availableWindowsUpdate = null
    if (manager) void downloadWindowsUpdate(manager, info, 'poll')
  } else if (isLinuxUpdateCapable()) {
    linuxSource = 'poll'
    void downloadLinuxUpdate()
  }
}

export function quitAndInstall(): void {
  if (pendingMigration) {
    const target = pendingMigration
    pendingMigration = null
    void installMigration(target).then((ok) => {
      if (ok) app.quit()
      else send({ state: 'manual', version: target.version, url: MANUAL_DOWNLOAD_URL })
    })
    return
  }
  if (isWindowsUpdateCapable()) {
    const manager = getWindowsUpdateManager()
    if (!manager || !pendingWindowsUpdate) return
    manager.waitExitThenApplyUpdate(pendingWindowsUpdate)
    app.quit()
  } else if (isLinuxUpdateCapable()) {
    linuxAutoUpdater.quitAndInstall()
  }
}
