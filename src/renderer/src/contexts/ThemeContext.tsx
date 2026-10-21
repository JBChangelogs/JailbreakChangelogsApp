import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react'
import {
  applyThemesCss,
  defaultThemeSlug,
  fetchThemes,
  getCachedThemes,
  type SiteTheme
} from '@renderer/lib/themes'
import {
  RECENT_THEMES_LIMIT,
  ThemeNotFoundError,
  applyCustomThemeCss,
  fetchSharedTheme,
  getSavedCustomTheme,
  getSavedRecentThemes,
  saveCustomTheme,
  saveRecentThemes,
  type CustomTheme
} from '@renderer/lib/customThemes'

/** A theme slug; the website's dashboard manages the list. */
export type Theme = string

const CURSOR_KEY = 'theme-cursor-enabled'
const SHORTCUT_HIDDEN_KEY = 'theme-shortcut-hidden'

interface ThemeContextValue {
  /**
   * The chosen theme, which is what syncs with the website. It can name a theme the list
   * doesn't have (yet), so draw from `applied` instead.
   */
  theme: Theme
  setTheme: (theme: Theme) => void
  /** Sets the site theme from another device's sync, leaving any custom theme on. */
  setSyncedTheme: (theme: Theme) => void
  /** The theme on screen: the chosen one, or the default if the list doesn't have it. */
  applied: SiteTheme
  /** Every enabled theme, in picker order. */
  themes: SiteTheme[]
  /** A custom theme from the website, drawn on top of the site theme; null when off. */
  customTheme: CustomTheme | null
  /** Turns a custom theme on (or off, with null). Picking a site theme turns it off too. */
  setCustomTheme: (theme: CustomTheme | null) => void
  /** Share codes of shared themes used here, newest first; synced with the website. */
  recentThemes: string[]
  /** A theme being tried on (drawn instead of the one in use, saved nowhere); null to stop. */
  setPreviewTheme: (theme: CustomTheme | null) => void
  setRecentThemes: (codes: string[]) => void
  rememberSharedTheme: (code: string) => void
  forgetSharedTheme: (code: string) => void
  cursorEnabled: boolean
  setCursorEnabled: (enabled: boolean) => void
  /** Whether the title bar's theme button is turned off. */
  shortcutHidden: boolean
  setShortcutHidden: (hidden: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const readFlag = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

const writeFlag = (key: string, value: boolean): void => {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // Storage blocked: the setting still applies for this session.
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [themes, setThemes] = useState(getCachedThemes)
  const [chosen, setChosen] = useState(() => localStorage.getItem('theme'))
  const [cursorEnabled, setCursorEnabledState] = useState(() => readFlag(CURSOR_KEY))
  const [shortcutHidden, setShortcutHiddenState] = useState(() => readFlag(SHORTCUT_HIDDEN_KEY))
  const [customTheme, setCustomThemeState] = useState(getSavedCustomTheme)
  const [recentThemes, setRecentThemesState] = useState(getSavedRecentThemes)
  const [previewTheme, setPreviewTheme] = useState<CustomTheme | null>(null)

  const setCustomTheme = useCallback((next: CustomTheme | null) => {
    setCustomThemeState(next)
    saveCustomTheme(next)
  }, [])

  const setRecentThemes = useCallback((codes: string[]) => {
    setRecentThemesState(codes)
    saveRecentThemes(codes)
  }, [])

  const rememberSharedTheme = useCallback(
    (code: string) =>
      setRecentThemes([code, ...recentThemes.filter((c) => c !== code)].slice(0, RECENT_THEMES_LIMIT)),
    [recentThemes, setRecentThemes]
  )

  const forgetSharedTheme = useCallback(
    (code: string) => setRecentThemes(recentThemes.filter((c) => c !== code)),
    [recentThemes, setRecentThemes]
  )

  const defaultSlug = defaultThemeSlug(themes)
  const theme = chosen ?? defaultSlug
  const applied =
    themes.find((t) => t.slug === theme) ?? themes.find((t) => t.slug === defaultSlug) ?? themes[0]

  // The saved copy may be stale: its owner can edit or delete it on the website.
  useEffect(() => {
    const saved = getSavedCustomTheme()
    if (!saved) return
    fetchSharedTheme(saved.share_code)
      .then((fresh) => setCustomThemeState((current) => (current?.share_code === fresh.share_code ? fresh : current)))
      .catch((err: unknown) => {
        if (err instanceof ThemeNotFoundError) setCustomTheme(null)
      })
  }, [setCustomTheme])

  useEffect(() => {
    fetchThemes()
      .then(setThemes)
      .catch(() => {
        // Offline or the API is down: keep the cached list.
      })
  }, [])

  // Before paint, so a cached theme shows without flashing the default.
  useLayoutEffect(() => applyThemesCss(themes), [themes])

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.remove(...themes.map((t) => t.slug))
    root.classList.add(applied.slug)
    const shown = previewTheme ?? customTheme
    applyCustomThemeCss(shown)
    root.dataset.scheme = shown?.scheme ?? applied.scheme
  }, [themes, applied, customTheme, previewTheme])

  useEffect(() => {
    if (customTheme) saveCustomTheme(customTheme)
  }, [customTheme])

  useEffect(() => {
    if (chosen) localStorage.setItem('theme', chosen)
  }, [chosen])

  useEffect(() => {
    document.documentElement.dataset.themeCursor = cursorEnabled ? 'on' : 'off'
  }, [cursorEnabled])

  const value: ThemeContextValue = {
    theme,
    setTheme: (next) => {
      setCustomTheme(null)
      setChosen(next)
    },
    setSyncedTheme: setChosen,
    applied,
    themes,
    customTheme,
    setCustomTheme,
    recentThemes,
    setRecentThemes,
    setPreviewTheme,
    rememberSharedTheme,
    forgetSharedTheme,
    cursorEnabled,
    setCursorEnabled: (enabled) => {
      setCursorEnabledState(enabled)
      writeFlag(CURSOR_KEY, enabled)
    },
    shortcutHidden,
    setShortcutHidden: (hidden) => {
      setShortcutHiddenState(hidden)
      writeFlag(SHORTCUT_HIDDEN_KEY, hidden)
    }
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
