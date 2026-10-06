import { useEffect, useRef } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useTheme, type Theme } from '@renderer/contexts/ThemeContext'
import {
  usePreferences,
  RICH_PRESENCE_PREFERENCE_KEYS,
  type RichPresencePreferenceKey
} from '@renderer/contexts/PreferencesContext'
import { useRealtime, type RealtimeMessage } from '@renderer/contexts/RealtimeContext'

const VALID_THEMES: readonly string[] = ['dark', 'amoled', 'light'] satisfies Theme[]

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && VALID_THEMES.includes(value)
}

function isRichPresenceKey(key: unknown): key is RichPresencePreferenceKey {
  return typeof key === 'string' && (RICH_PRESENCE_PREFERENCE_KEYS as readonly string[]).includes(key)
}

export function useRealtimePreferences(): void {
  const { token } = useAuth()
  const { theme, setTheme } = useTheme()
  const { twemojiEnabled, setTwemojiEnabled, richPresence, setRichPresence } = usePreferences()
  const { send, subscribe } = useRealtime()

  const lastServerThemeRef = useRef<Theme | null>(null)
  const lastServerTwemojiRef = useRef<boolean | null>(null)
  const lastServerRichPresenceRef = useRef<Partial<Record<RichPresencePreferenceKey, boolean>>>({})

  useEffect(() => {
    return subscribe((message: RealtimeMessage) => {
      if (message.action === 'preferences_sync' || message.action === 'preferences') {
        const data = message.data as Record<string, unknown> | undefined
        if (data && isTheme(data.theme)) {
          lastServerThemeRef.current = data.theme
          setTheme(data.theme)
        }
        if (typeof data?.twemoji_enabled === 'boolean') {
          lastServerTwemojiRef.current = data.twemoji_enabled
          setTwemojiEnabled(data.twemoji_enabled)
        }
        for (const key of RICH_PRESENCE_PREFERENCE_KEYS) {
          const value = data?.[key]
          if (typeof value === 'boolean') {
            lastServerRichPresenceRef.current[key] = value
            setRichPresence(key, value)
            window.api.discordRpc.setPreference(key, value)
          }
        }
      } else if (message.action === 'preferences_update') {
        const update = message.data as { key?: string; value?: unknown } | undefined
        if (update?.key === 'theme' && isTheme(update.value)) {
          lastServerThemeRef.current = update.value
          setTheme(update.value)
        }
        if (update?.key === 'twemoji_enabled' && typeof update.value === 'boolean') {
          lastServerTwemojiRef.current = update.value
          setTwemojiEnabled(update.value)
        }
        if (isRichPresenceKey(update?.key) && typeof update?.value === 'boolean') {
          lastServerRichPresenceRef.current[update.key] = update.value
          setRichPresence(update.key, update.value)
          window.api.discordRpc.setPreference(update.key, update.value)
        }
      }
    })
  }, [subscribe, setTheme, setTwemojiEnabled, setRichPresence])

  useEffect(() => {
    if (!token) return
    if (lastServerThemeRef.current === theme) return
    lastServerThemeRef.current = theme
    send({ type: 'set_preference', key: 'theme', value: theme })
  }, [theme, token, send])

  useEffect(() => {
    if (!token) return
    if (lastServerTwemojiRef.current === twemojiEnabled) return
    lastServerTwemojiRef.current = twemojiEnabled
    send({ type: 'set_preference', key: 'twemoji_enabled', value: twemojiEnabled })
  }, [twemojiEnabled, token, send])

  useEffect(() => {
    if (!token) return
    for (const key of RICH_PRESENCE_PREFERENCE_KEYS) {
      const value = richPresence[key]
      if (lastServerRichPresenceRef.current[key] === value) continue
      lastServerRichPresenceRef.current[key] = value
      send({ type: 'set_preference', key, value })
    }
  }, [richPresence, token, send])
}
