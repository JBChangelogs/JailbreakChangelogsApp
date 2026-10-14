import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import {
  applyThemesCss,
  defaultThemeSlug,
  fetchThemes,
  getCachedThemes,
  type SiteTheme
} from '@renderer/lib/themes'

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
  /** The theme on screen: the chosen one, or the default if the list doesn't have it. */
  applied: SiteTheme
  /** Every enabled theme, in picker order. */
  themes: SiteTheme[]
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

  const defaultSlug = defaultThemeSlug(themes)
  const theme = chosen ?? defaultSlug
  const applied =
    themes.find((t) => t.slug === theme) ?? themes.find((t) => t.slug === defaultSlug) ?? themes[0]

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
    root.dataset.scheme = applied.scheme
  }, [themes, applied])

  useEffect(() => {
    if (chosen) localStorage.setItem('theme', chosen)
  }, [chosen])

  useEffect(() => {
    document.documentElement.dataset.themeCursor = cursorEnabled ? 'on' : 'off'
  }, [cursorEnabled])

  const value: ThemeContextValue = {
    theme,
    setTheme: setChosen,
    applied,
    themes,
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
