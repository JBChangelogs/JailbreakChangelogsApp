import { execFileSync } from 'child_process'
import { copyFileSync, mkdirSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const DESKTOP_ENTRY_NAME = 'jailbreak-changelogs.desktop'
const ICON_NAME = 'jailbreak-changelogs'

export function ensureLinuxProtocolHandler(protocol: string, iconPngPath: string): void {
  if (process.platform !== 'linux') return

  const appImagePath = process.env.APPIMAGE
  if (!appImagePath) return

  const appsDir = join(homedir(), '.local', 'share', 'applications')
  const desktopFilePath = join(appsDir, DESKTOP_ENTRY_NAME)

  const desktopEntry = [
    '[Desktop Entry]',
    'Name=Jailbreak Changelogs',
    `Exec="${appImagePath}" %u`,
    'Terminal=false',
    'Type=Application',
    `Icon=${ICON_NAME}`,
    'StartupWMClass=jailbreak-changelogs',
    `MimeType=x-scheme-handler/${protocol};`,
    'Categories=Network;',
    ''
  ].join('\n')

  try {
    mkdirSync(appsDir, { recursive: true })
    writeFileSync(desktopFilePath, desktopEntry, 'utf-8')
    execFileSync('update-desktop-database', [appsDir], { stdio: 'ignore' })
    execFileSync('xdg-mime', ['default', DESKTOP_ENTRY_NAME, `x-scheme-handler/${protocol}`], { stdio: 'ignore' })
  } catch (error) {
    console.warn('[linux-protocol] failed to register URL scheme handler:', error)
  }

  try {
    const iconDir = join(homedir(), '.local', 'share', 'icons', 'hicolor', '512x512', 'apps')
    mkdirSync(iconDir, { recursive: true })
    copyFileSync(iconPngPath, join(iconDir, `${ICON_NAME}.png`))
    execFileSync('gtk-update-icon-cache', [join(homedir(), '.local', 'share', 'icons', 'hicolor')], {
      stdio: 'ignore'
    })
  } catch (error) {
    console.warn('[linux-protocol] failed to install app icon:', error)
  }
}
