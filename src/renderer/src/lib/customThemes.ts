// Custom themes are made on the website (Supporter Tier 2+); the app only applies them. Like the
// website, a custom theme sits on top of the site theme, and only its share code syncs between
// devices (the `custom_theme` preference). Shared themes someone used are remembered as codes in
// `recent_custom_themes`, newest first.

import { readableTextColor } from '@renderer/lib/accentColor'
import { ICON, safeValue, type SiteTheme } from '@renderer/lib/themes'

const API_BASE = 'https://api.jailbreakchangelogs.com'
export const SITE_THEMES_URL = 'https://jailbreakchangelogs.com/settings?highlight=themes#themes'

const STORAGE_KEY = 'custom_theme'
const RECENT_KEY = 'recent_custom_themes'
export const RECENT_THEMES_LIMIT = 5

export interface CustomTheme {
  share_code: string
  label: string
  scheme: 'dark' | 'light'
  vars: Record<string, string>
  logo_filter: string | null
  icon: string | null
}

export const SHARE_CODE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/
// Only colors: a custom theme can't move layout variables.
const COLOR_KEY = /^--color-[a-z0-9-]+$/

/** The share code in a pasted code, a share link (…?theme=CODE) or a /themes/shared/CODE link. */
export function parseShareCode(input: string): string | null {
  const text = input.trim()
  let candidate = text
  try {
    const url = new URL(text)
    candidate = url.searchParams.get('theme') ?? url.pathname.match(/\/themes\/shared\/([^/]+)/)?.[1] ?? ''
  } catch {
    // Not a link, so it's the code itself.
  }
  const code = candidate.trim().toUpperCase()
  return SHARE_CODE.test(code) ? code : null
}

/** Checks a theme from the API or storage; its values end up in a <style> tag. */
export function sanitizeCustomTheme(raw: unknown): CustomTheme | null {
  const t = raw as Partial<CustomTheme> | null
  if (!t || typeof t.share_code !== 'string' || !SHARE_CODE.test(t.share_code)) return null
  return {
    share_code: t.share_code,
    label: typeof t.label === 'string' ? t.label : t.share_code,
    scheme: t.scheme === 'light' ? 'light' : 'dark',
    vars: Object.fromEntries(
      Object.entries(t.vars ?? {}).filter(([key, value]) => COLOR_KEY.test(key) && safeValue(value))
    ),
    logo_filter: safeValue(t.logo_filter) ? t.logo_filter : null,
    icon: typeof t.icon === 'string' && ICON.test(t.icon) ? t.icon : null
  }
}

/** For previews, which take a site theme. */
export function asSiteTheme(theme: CustomTheme): SiteTheme {
  return {
    slug: `custom-${theme.share_code.toLowerCase()}`,
    label: theme.label,
    icon: theme.icon ?? 'lucide:palette',
    scheme: theme.scheme,
    vars: theme.vars,
    logo_filter: theme.logo_filter,
    cursor_url: null,
    cursor_size: null,
    is_default: false
  }
}

function marketThemeVars(vars: Record<string, string>): Record<string, string> {
  const colors = Object.fromEntries(
    Object.entries(vars).filter(([key]) => !key.startsWith('--color-badge-') && !/^--color-(demand|trend)-.+-text$/.test(key))
  )
  let canvas: CanvasRenderingContext2D | null | undefined
  const resolve = (value: string): string => {
    for (let i = 0; i < 8 && value.includes('var('); i++) {
      value = value.replace(/var\((--color-[a-z0-9-]+)\)/g, (match, key: string) => colors[key] ?? match)
    }
    return value
  }
  for (const [key, value] of Object.entries(colors)) {
    if (!/^--color-(demand|trend)-[a-z-]+$/.test(key)) continue
    let hex = resolve(value)
    if (!/^#[0-9a-f]{6}$/i.test(hex)) {
      canvas ??= document.createElement('canvas').getContext('2d')
      if (!canvas) continue
      canvas.fillStyle = '#ffffff'
      canvas.fillRect(0, 0, 1, 1)
      for (const bg of [colors['--color-primary-bg'], colors['--color-secondary-bg'], hex]) {
        if (!bg) continue
        canvas.fillStyle = resolve(bg)
        canvas.fillRect(0, 0, 1, 1)
      }
      const [r, g, b] = canvas.getImageData(0, 0, 1, 1).data
      hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
    }
    colors[`${key}-text`] = readableTextColor(hex)
  }
  return colors
}

/** Puts the custom theme's CSS on the page, or removes it. Beats the site theme's `:root.slug`. */
export function applyCustomThemeCss(theme: CustomTheme | null): void {
  const root = document.documentElement
  let style = document.getElementById('custom-theme')
  if (!theme) {
    style?.remove()
    delete root.dataset.customTheme
    return
  }
  if (!style) {
    style = document.createElement('style')
    style.id = 'custom-theme'
    document.head.append(style)
  }
  const selector = ':root:root[data-custom-theme]'
  const vars = Object.entries(marketThemeVars(theme.vars))
    .map(([key, value]) => `${key}:${value};`)
    .join('')
  style.textContent =
    `${selector}{color-scheme:${theme.scheme};${vars}}` +
    `${selector} .header-logo{filter:${theme.logo_filter ?? 'none'}}`
  root.dataset.customTheme = theme.share_code
}

export function getSavedCustomTheme(): CustomTheme | null {
  try {
    return sanitizeCustomTheme(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'))
  } catch {
    return null
  }
}

export function saveCustomTheme(theme: CustomTheme | null): void {
  try {
    if (theme) localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked: the theme still applies for this session.
  }
}

export function parseRecentThemes(value: unknown): string[] {
  if (typeof value !== 'string') return []
  return [...new Set(value.split(','))].filter((code) => SHARE_CODE.test(code)).slice(0, RECENT_THEMES_LIMIT)
}

export function getSavedRecentThemes(): string[] {
  try {
    return parseRecentThemes(localStorage.getItem(RECENT_KEY))
  } catch {
    return []
  }
}

export function saveRecentThemes(codes: string[]): void {
  try {
    if (codes.length) localStorage.setItem(RECENT_KEY, codes.join(','))
    else localStorage.removeItem(RECENT_KEY)
  } catch {
    // Storage blocked: the list still holds for this session.
  }
}

export class ThemeNotFoundError extends Error {}

const NOT_FOUND_MESSAGE = "This theme code doesn't exist, or its owner deleted it."


/** Public; throws ThemeNotFoundError when the code doesn't exist (or was deleted). */
export async function fetchSharedTheme(code: string): Promise<CustomTheme> {
  const res = await fetch(`${API_BASE}/v2/themes/shared/${code}`)
  if (res.status === 404) throw new ThemeNotFoundError(NOT_FOUND_MESSAGE)
  if (res.status === 429) throw new Error('Too many lookups. Try again in a minute.')
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  const theme = sanitizeCustomTheme(await res.json())
  if (!theme) throw new ThemeNotFoundError(NOT_FOUND_MESSAGE)
  return theme
}

export async function fetchMyThemes(token: string): Promise<CustomTheme[]> {
  const res = await fetch(`${API_BASE}/v2/users/me/themes`, { headers: { Authorization: token } })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  const data = (await res.json()) as { themes?: unknown[] }
  return (data.themes ?? []).map(sanitizeCustomTheme).filter((t): t is CustomTheme => t !== null)
}
