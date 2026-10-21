// Themes come from the site's API (GET /v2/themes), which the dashboard edits, so the app shows the
// same themes as the website. The last good list is cached so startup and offline use don't wait on it.

const API_BASE = 'https://api.jailbreakchangelogs.com'
// Cursor paths like /cursors/x.svg are served by the website.
const SITE_ORIGIN = 'https://jailbreakchangelogs.com'
const CACHE_KEY = 'jbcl:themes'

export interface SiteTheme {
  slug: string
  label: string
  /** An Iconify name, e.g. lucide:moon. */
  icon: string
  scheme: 'dark' | 'light'
  vars: Record<string, string>
  logo_filter: string | null
  cursor_url: string | null
  cursor_size: number | null
  is_default: boolean
}

// Used until the API has answered once. Empty vars fall through to the @theme defaults in
// main.css, which are the dark theme.
export const FALLBACK_THEMES: SiteTheme[] = [
  {
    slug: 'dark',
    label: 'Dark',
    icon: 'lucide:moon',
    scheme: 'dark',
    vars: {},
    logo_filter: null,
    cursor_url: '/cursors/dark-moon.svg',
    cursor_size: null,
    is_default: true
  }
]

// The API validates these too; they're checked again because the values are written into a
// <style> tag, where one bad value could break out of it or comment out the rest.
const SLUG = /^[a-z][a-z0-9-]{0,31}$/
export const ICON = /^[a-z0-9-]+:[a-z0-9-]+$/
const VAR_KEY = /^--[a-z0-9-]+$/
const CSS_VALUE = /^[^{};<>\\\u0000-\u001f]{1,200}$/
const CSS_BANNED = /url\(|expression\(|@import|\/\*/i
const CURSOR_URL = /^\/[A-Za-z0-9/_.-]+$|^https:\/\/[^\s"'()<>\\]+$/

export const isThemeSlug = (value: unknown): value is string =>
  typeof value === 'string' && SLUG.test(value)

export const safeValue = (value: unknown): value is string =>
  typeof value === 'string' && CSS_VALUE.test(value) && !CSS_BANNED.test(value)

/** Drops themes with bad slugs and any values that aren't safe as raw CSS. */
export function sanitizeThemes(themes: unknown): SiteTheme[] {
  if (!Array.isArray(themes)) return []
  return themes
    .filter((t: SiteTheme) => isThemeSlug(t?.slug))
    .map((t: SiteTheme) => ({
      slug: t.slug,
      label: typeof t.label === 'string' ? t.label : t.slug,
      icon: typeof t.icon === 'string' && ICON.test(t.icon) ? t.icon : 'lucide:palette',
      scheme: t.scheme === 'light' ? 'light' : 'dark',
      vars: Object.fromEntries(
        Object.entries(t.vars ?? {}).filter(([key, value]) => VAR_KEY.test(key) && safeValue(value))
      ),
      logo_filter: safeValue(t.logo_filter) ? t.logo_filter : null,
      cursor_url: t.cursor_url && CURSOR_URL.test(t.cursor_url) ? t.cursor_url : null,
      cursor_size: Number.isInteger(t.cursor_size) ? t.cursor_size : null,
      is_default: t.is_default === true
    }))
}

/** Each theme's CSS, keyed by the class the theme puts on <html>. */
export function themesCss(themes: SiteTheme[]): string {
  return themes
    .map((t) => {
      const root = `:root.${t.slug}`
      const vars = Object.entries(t.vars)
        .map(([key, value]) => `${key}:${value};`)
        .join('')
      let css = `${root}{color-scheme:${t.scheme};${vars}}`
      if (t.logo_filter) css += `${root} .header-logo{filter:${t.logo_filter}}`
      if (t.cursor_size)
        css += `${root} .theme-cursor-icon{width:${t.cursor_size}px;height:${t.cursor_size}px}`
      if (t.cursor_url) {
        const url = t.cursor_url.startsWith('/') ? SITE_ORIGIN + t.cursor_url : t.cursor_url
        css += `${root}{--theme-cursor-icon:url("${url}")}`
      }
      return css
    })
    .join('\n')
}

/** Puts the themes' CSS on the page, replacing any earlier list. */
export function applyThemesCss(themes: SiteTheme[]): void {
  let style = document.getElementById('site-themes')
  if (!style) {
    style = document.createElement('style')
    style.id = 'site-themes'
    document.head.append(style)
  }
  style.textContent = themesCss(themes)
}

export function getCachedThemes(): SiteTheme[] {
  try {
    const themes = sanitizeThemes(JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null'))
    return themes.length ? themes : FALLBACK_THEMES
  } catch {
    return FALLBACK_THEMES
  }
}

/** Fetches the enabled themes in picker order and caches them; throws if there are none. */
export async function fetchThemes(): Promise<SiteTheme[]> {
  const res = await fetch(`${API_BASE}/v2/themes`)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  const themes = sanitizeThemes(await res.json())
  if (!themes.length) throw new Error('No themes')
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(themes))
  } catch {
    // Storage full or blocked: the themes still apply for this session.
  }
  return themes
}

export const defaultThemeSlug = (themes: SiteTheme[]): string =>
  (themes.find((t) => t.is_default) ?? themes[0]).slug

// A var(--x) value would read the current theme's --x in a preview, so previews look it up in
// the theme's own vars. Missing values fall back to the dark defaults through the page's vars.
export function themeColor(theme: SiteTheme, key: string): string {
  const value = theme.vars[key] ?? `var(${key})`
  return theme.vars[value.match(/^var\((--[a-z0-9-]+)\)$/)?.[1] ?? ''] ?? value
}

/** The Iconify icon as an image URL, drawn in currentColor with a CSS mask. */
export const iconUrl = (icon: string): string => {
  const [prefix, name] = icon.split(':')
  return `https://api.iconify.design/${prefix}/${name}.svg`
}
