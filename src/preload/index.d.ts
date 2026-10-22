import { ElectronAPI } from '@electron-toolkit/preload'
import type { DesktopApi } from '../shared/desktopApi'

declare global {
  interface Window {
    electron?: ElectronAPI
    api: DesktopApi
  }
}
