import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { settingsApi } from '@renderer/lib/settingsApi'
import {
  ensureUserSettingsLoaded,
  getCachedUserSettings,
  setCachedUserSetting,
  subscribeUserSettings
} from '@renderer/lib/userSettings'
import type { SettingsCategories } from '@shared/settings'

export function useAccountSettings(): {
  settings: SettingsCategories | null
  loading: boolean
  error: string | null
  pending: Set<string>
  toggle: (name: string, next: boolean) => Promise<void>
} {
  const { token } = useAuth()
  const [settings, setSettings] = useState<SettingsCategories | null>(getCachedUserSettings())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Set<string>>(new Set())

  useEffect(() => subscribeUserSettings(setSettings), [])

  useEffect(() => {
    if (!token || settings) return
    setLoading(true)
    setError(null)
    ensureUserSettingsLoaded(token)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load settings'))
      .finally(() => setLoading(false))
  }, [token, settings])

  const toggle = async (name: string, next: boolean): Promise<void> => {
    if (!token) return
    const previous = !next
    setCachedUserSetting(name, next)
    setPending((prev) => new Set(prev).add(name))
    try {
      await settingsApi.updateMine(token, [{ name, value: next }])
    } catch {
      setCachedUserSetting(name, previous)
    } finally {
      setPending((prev) => {
        const nextSet = new Set(prev)
        nextSet.delete(name)
        return nextSet
      })
    }
  }

  return { settings, loading, error, pending, toggle }
}
