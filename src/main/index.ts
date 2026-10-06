import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.ico?asset'
import iconPng from '../../resources/icon.png?asset'
import { saveToken, loadToken, clearToken } from './auth'
import {
  connectDiscordRpc,
  disconnectDiscordRpc,
  refreshDiscordPresence,
  setRobloxActivity,
  setRichPresencePreference,
  type RichPresencePreferenceKey
} from './discordRpc'
import { initAutoUpdater, startAutoUpdateChecks, checkForUpdates, quitAndInstall } from './autoUpdater'
import { isDevToolsAllowed, refreshDevToolsAccess } from './devToolsAccess'
import { showDesktopNotification, registerWindowsToastIdentity } from './notifications'
import { ensureLinuxProtocolHandler } from './linuxProtocol'
import { startRobloxGameWatcher } from './robloxGameWatcher'
import { VelopackApp } from 'velopack'

VelopackApp.build().run()

const PROTOCOL = 'jailbreakchangelogs'
const APP_USER_MODEL_ID = 'com.jailbreakchangelogs.desktop'
const OAUTH_LOGIN_URL = 'https://api.jailbreakchangelogs.com/oauth?application=true'
const isMac = process.platform === 'darwin'

if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')
}

app.setName('jailbreak-changelogs')

let mainWindow: BrowserWindow | null = null
let pendingProtocolUrl: string | null = null

function extractProtocolUrl(argv: string[]): string | undefined {
  return argv.find((arg) => arg.startsWith(`${PROTOCOL}://`))
}

function deliverProtocolUrl(url: string): void {
  mainWindow?.webContents.send('protocol:url', url)

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return
  }
  if (parsed.hostname !== 'auth') return

  const token = parsed.searchParams.get('token')
  const error = parsed.searchParams.get('error')

  if (token) {
    saveToken(token)
    mainWindow?.webContents.send('auth:login-success', token)
    refreshDiscordPresence()
    void refreshDevToolsAccess()
  } else if (error) {
    mainWindow?.webContents.send('auth:login-error', error)
  }
}

function handleProtocolUrl(url: string): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    deliverProtocolUrl(url)
  } else {
    pendingProtocolUrl = url
  }
}

function watchWindowShortcuts(window: BrowserWindow): void {
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return

    if (is.dev) {
      if (input.code === 'F12') {
        if (window.webContents.isDevToolsOpened()) window.webContents.closeDevTools()
        else window.webContents.openDevTools({ mode: 'undocked' })
      }
    } else {
      const isDevToolsShortcut =
        input.code === 'KeyI' && ((input.alt && input.meta) || (input.control && input.shift))
      if (isDevToolsShortcut && !isDevToolsAllowed()) {
        event.preventDefault()
      }
    }

    if (input.code === 'KeyR' && (input.control || input.meta)) {
      event.preventDefault()
      window.webContents.reload()
    }

    if (input.code === 'Minus' && (input.control || input.meta)) event.preventDefault()
    if (input.code === 'Equal' && input.shift && (input.control || input.meta)) {
      event.preventDefault()
    }
  })
}

function registerProtocolClient(): void {
  if (process.defaultApp) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [__filename])
  } else if (process.platform !== 'linux') {
    app.setAsDefaultProtocolClient(PROTOCOL)
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 720,
    minHeight: 480,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#121317',
    frame: false,
    titleBarStyle: isMac ? 'hiddenInset' : undefined,
    icon: process.platform === 'win32' ? icon : iconPng,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs')
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    if (pendingProtocolUrl) {
      deliverProtocolUrl(pendingProtocolUrl)
      pendingProtocolUrl = null
    }
  })

  initAutoUpdater(mainWindow)

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-change', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-change', false)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const url = extractProtocolUrl(argv)
    if (url) handleProtocolUrl(url)
  })

  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleProtocolUrl(url)
  })

  app.whenReady().then(() => {
    session.defaultSession.webRequest.onBeforeSendHeaders(
      {
        urls: [
          'https://api.jailbreakchangelogs.com/*',
          'wss://api.jailbreakchangelogs.com/*',
          'https://inventories.jailbreakchangelogs.com/*',
          'wss://inventories.jailbreakchangelogs.com/*'
        ]
      },
      (details, callback) => {
        details.requestHeaders['User-Agent'] = 'JailbreakChangelogsApp'
        callback({ requestHeaders: details.requestHeaders })
      }
    )

    electronApp.setAppUserModelId(APP_USER_MODEL_ID)
    registerWindowsToastIdentity(APP_USER_MODEL_ID, icon)
    ensureLinuxProtocolHandler(PROTOCOL, iconPng)
    registerProtocolClient()

    ipcMain.on('window:minimize', () => mainWindow?.minimize())
    ipcMain.on('window:toggle-maximize', () => {
      if (!mainWindow) return
      if (mainWindow.isMaximized()) mainWindow.unmaximize()
      else mainWindow.maximize()
    })
    ipcMain.on('window:close', () => mainWindow?.close())
    ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false)
    ipcMain.handle('auth:login', () => shell.openExternal(OAUTH_LOGIN_URL))
    ipcMain.handle('auth:get-token', () => loadToken())
    ipcMain.on('auth:logout', () => clearToken())

    ipcMain.handle('shell:open-external', (_event, url: string) => {
      const isHttp = /^https?:\/\//i.test(url)
      const isRobloxJoinLink = /^roblox:\/\/experiences\/start\?placeId=\d+&gameInstanceId=[\w-]+$/i.test(url)
      if (!isHttp && !isRobloxJoinLink) return
      return shell.openExternal(url)
    })

    ipcMain.on('updater:quit-and-install', () => quitAndInstall())
    ipcMain.on('updater:check-now', () => checkForUpdates())

    ipcMain.on('discord-rpc:set-preference', (_event, key: RichPresencePreferenceKey, value: boolean) => {
      setRichPresencePreference(key, value)
    })

    ipcMain.handle('notifications:show', (_event, options: { id: string; title: string; body?: string }) => {
      showDesktopNotification(options, mainWindow)
    })

    app.on('browser-window-created', (_, window) => {
      watchWindowShortcuts(window)
    })

    createWindow()
    connectDiscordRpc()
    startAutoUpdateChecks()
    void refreshDevToolsAccess()
    startRobloxGameWatcher((event) => {
      mainWindow?.webContents.send('roblox:activity-changed', event)
      setRobloxActivity(event)
    })

    const cliUrl = extractProtocolUrl(process.argv)
    if (cliUrl) pendingProtocolUrl = cliUrl

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

let isQuitting = false
app.on('before-quit', (event) => {
  if (isQuitting) return
  event.preventDefault()
  isQuitting = true
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000))
  Promise.race([disconnectDiscordRpc(), timeout]).finally(() => app.quit())
})
