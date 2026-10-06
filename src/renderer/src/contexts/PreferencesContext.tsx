import { createContext, useCallback, useContext, useState } from 'react'

export const RICH_PRESENCE_PREFERENCE_KEYS = [
  'rich_presence_enabled',
  'rich_presence_show_details',
  'rich_presence_show_state',
  'rich_presence_show_roblox_badge',
  'rich_presence_show_join_button',
  'rich_presence_show_website_button'
] as const
export type RichPresencePreferenceKey = (typeof RICH_PRESENCE_PREFERENCE_KEYS)[number]

const DEFAULT_RICH_PRESENCE: Record<RichPresencePreferenceKey, boolean> = {
  rich_presence_enabled: true,
  rich_presence_show_details: true,
  rich_presence_show_state: true,
  rich_presence_show_roblox_badge: true,
  rich_presence_show_join_button: true,
  rich_presence_show_website_button: true
}

interface PreferencesContextValue {
  twemojiEnabled: boolean
  setTwemojiEnabled: (value: boolean) => void
  richPresence: Record<RichPresencePreferenceKey, boolean>
  setRichPresence: (key: RichPresencePreferenceKey, value: boolean) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [twemojiEnabled, setTwemojiEnabled] = useState(false)
  const [richPresence, setRichPresenceState] = useState(DEFAULT_RICH_PRESENCE)

  const setRichPresence = useCallback((key: RichPresencePreferenceKey, value: boolean) => {
    setRichPresenceState((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }, [])

  return (
    <PreferencesContext.Provider
      value={{ twemojiEnabled, setTwemojiEnabled, richPresence, setRichPresence }}
    >
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider')
  return ctx
}
