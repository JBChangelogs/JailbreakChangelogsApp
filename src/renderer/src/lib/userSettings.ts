import { settingsApi } from '@renderer/lib/settingsApi'
import type { SettingsCategories } from '@shared/settings'

let cached: SettingsCategories | null = null
let inflight: Promise<SettingsCategories> | null = null
const listeners = new Set<(settings: SettingsCategories | null) => void>()

function notify(): void {
  for (const listener of listeners) listener(cached)
}

export function subscribeUserSettings(listener: (settings: SettingsCategories | null) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCachedUserSettings(): SettingsCategories | null {
  return cached
}

export function ensureUserSettingsLoaded(token: string): Promise<SettingsCategories> {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = settingsApi
      .getMine(token)
      .then((data) => {
        cached = data
        inflight = null
        notify()
        return data
      })
      .catch((err: unknown) => {
        inflight = null
        throw err
      })
  }
  return inflight
}

export function findUserSetting(name: string): boolean | undefined {
  if (!cached) return undefined
  for (const category of Object.values(cached)) {
    const setting = category.settings.find((s) => s.name === name)
    if (setting) return setting.value
  }
  return undefined
}

export function setCachedUserSetting(name: string, value: boolean): void {
  if (!cached) return
  for (const category of Object.values(cached)) {
    const setting = category.settings.find((s) => s.name === name)
    if (setting) {
      setting.value = value
      break
    }
  }
  notify()
}
