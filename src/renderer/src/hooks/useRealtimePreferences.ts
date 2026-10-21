import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useTheme, type Theme } from '@renderer/contexts/ThemeContext'
import { isThemeSlug } from '@renderer/lib/themes'
import {
  SHARE_CODE,
  ThemeNotFoundError,
  fetchSharedTheme,
  parseRecentThemes
} from '@renderer/lib/customThemes'
import {
  usePreferences,
  RICH_PRESENCE_PREFERENCE_KEYS,
  type RichPresencePreferenceKey
} from '@renderer/contexts/PreferencesContext'
import { useRealtime, type RealtimeMessage } from '@renderer/contexts/RealtimeContext'

// Any theme the website has; ThemeContext shows the default until the list includes it.
const isTheme = isThemeSlug

function isRichPresenceKey(key: unknown): key is RichPresencePreferenceKey {
  return typeof key === 'string' && (RICH_PRESENCE_PREFERENCE_KEYS as readonly string[]).includes(key)
}

export function useRealtimePreferences(): void {
  const { token } = useAuth()
  const { theme, setSyncedTheme: setTheme, customTheme, setCustomTheme, recentThemes, setRecentThemes } = useTheme()
  const { twemojiEnabled, setTwemojiEnabled, richPresence, setRichPresence } = usePreferences()
  const { send, subscribe } = useRealtime()

  const lastServerThemeRef = useRef<Theme | null>(null)
  const lastServerTwemojiRef = useRef<boolean | null>(null)
  const lastServerRichPresenceRef = useRef<Partial<Record<RichPresencePreferenceKey, boolean>>>({})

  // Custom themes only sync once the server's preferences have arrived, so a device that hasn't
  // heard them yet can't clear the custom theme everywhere else.
  const syncedRef = useRef(false)
  const lastServerCustomRef = useRef<string | null>(null)
  const lastServerRecentRef = useRef<string>('')
  const customCodeRef = useRef(customTheme?.share_code ?? null)
  customCodeRef.current = customTheme?.share_code ?? null
  const customLoadRef = useRef(0)

  const applyServerCustomTheme = useCallback(
    (value: unknown) => {
      const code = typeof value === 'string' && SHARE_CODE.test(value) ? value : null
      lastServerCustomRef.current = code
      const load = ++customLoadRef.current
      if (code === customCodeRef.current) return
      if (!code) {
        setCustomTheme(null)
        return
      }
      fetchSharedTheme(code)
        .then((fetched) => {
          if (load === customLoadRef.current) setCustomTheme(fetched)
        })
        .catch((err: unknown) => {
          // Deleted by its owner: stop using it (the effect below clears it everywhere).
          if (load === customLoadRef.current && err instanceof ThemeNotFoundError) setCustomTheme(null)
        })
    },
    [setCustomTheme]
  )

  const applyServerRecentThemes = useCallback(
    (value: unknown) => {
      const codes = parseRecentThemes(value)
      lastServerRecentRef.current = codes.join(',')
      setRecentThemes(codes)
    },
    [setRecentThemes]
  )

  useEffect(() => {
    return subscribe((message: RealtimeMessage) => {
      if (message.action === 'preferences_sync' || message.action === 'preferences') {
        const data = message.data as Record<string, unknown> | undefined
        syncedRef.current = true
        applyServerCustomTheme(data?.custom_theme)
        applyServerRecentThemes(data?.recent_custom_themes)
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
        const update = message.data as { action?: string; key?: string; value?: unknown } | undefined
        const value = update?.action === 'delete' ? null : update?.value
        if (update?.key === 'custom_theme') applyServerCustomTheme(value)
        if (update?.key === 'recent_custom_themes') applyServerRecentThemes(value)
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
  }, [subscribe, setTheme, setTwemojiEnabled, setRichPresence, applyServerCustomTheme, applyServerRecentThemes])

  useEffect(() => {
    const code = customTheme?.share_code ?? null
    if (!token || !syncedRef.current || lastServerCustomRef.current === code) return
    lastServerCustomRef.current = code
    send(
      code
        ? { type: 'set_preference', key: 'custom_theme', value: code }
        : { type: 'delete_preference', key: 'custom_theme' }
    )
  }, [customTheme, token, send])

  useEffect(() => {
    const joined = recentThemes.join(',')
    if (!token || !syncedRef.current || lastServerRecentRef.current === joined) return
    lastServerRecentRef.current = joined
    send(
      joined
        ? { type: 'set_preference', key: 'recent_custom_themes', value: joined }
        : { type: 'delete_preference', key: 'recent_custom_themes' }
    )
  }, [recentThemes, token, send])

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
