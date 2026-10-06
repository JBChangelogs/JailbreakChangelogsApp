import { Notification, type BrowserWindow } from 'electron'
import { execFileSync } from 'child_process'
import icon from '../../resources/icon.png?asset'

export function registerWindowsToastIdentity(aumid: string, iconPath: string): void {
  if (process.platform !== 'win32') return
  const keyPath = `HKCU\\Software\\Classes\\AppUserModelId\\${aumid}`
  try {
    execFileSync('reg', ['add', keyPath, '/v', 'DisplayName', '/t', 'REG_SZ', '/d', 'Jailbreak Changelogs', '/f'])
    execFileSync('reg', ['add', keyPath, '/v', 'IconUri', '/t', 'REG_SZ', '/d', iconPath, '/f'])
  } catch (err) {
    console.error('[notifications] failed to register Windows toast identity', err)
  }
}

interface ShowNotificationOptions {
  id: string
  title: string
  body?: string
}

export function showDesktopNotification(
  options: ShowNotificationOptions,
  mainWindow: BrowserWindow | null
): void {
  if (!Notification.isSupported()) return

  const notification = new Notification({
    title: options.title,
    body: options.body,
    icon
  })

  notification.on('click', () => {
    mainWindow?.show()
    mainWindow?.focus()
    mainWindow?.webContents.send('notifications:clicked', options.id)
  })

  notification.show()
}
