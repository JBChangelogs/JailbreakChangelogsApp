import type { CSSProperties } from 'react'

export const ACCENT_STYLES = ['solid', 'glass', 'transparent'] as const
export type AccentStyle = (typeof ACCENT_STYLES)[number]

export interface Accent {
  color: string
  gradient: string | null
  style: AccentStyle
}

export interface Hsv {
  h: number
  s: number
  v: number
}

export function accentColorToHex(color: number | string | null | undefined): string | null {
  if (color === null || color === undefined) return null
  if (color === '' || color === 'None' || color === '0' || color === 0) return null
  if (typeof color === 'number' || /^\d+$/.test(color)) return `#${Number(color).toString(16).padStart(6, '0')}`
  const hex = color.replace(/^#/, '')
  return /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toLowerCase()}` : null
}

export const toAccentStyle = (style: unknown): AccentStyle =>
  ACCENT_STYLES.includes(style as AccentStyle) ? (style as AccentStyle) : 'solid'

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function readableTextColor(...hexes: [string, ...string[]]): '#000000' | '#ffffff' {
  const ls = hexes.map(luminance)
  const onBlack = Math.min(...ls.map((l) => (l + 0.05) / 0.05))
  const onWhite = Math.min(...ls.map((l) => 1.05 / (l + 0.05)))
  return onBlack > onWhite ? '#000000' : '#ffffff'
}

export function accentCardTheme({ color, gradient, style }: Accent): CSSProperties {
  const base = gradient ? `color-mix(in srgb, ${color}, ${gradient})` : color
  const fill = (hex: string): string =>
    style === 'glass'
      ? `color-mix(in srgb, color-mix(in srgb, ${hex} 35%, var(--color-primary-bg)) 60%, transparent)`
      : style === 'transparent'
        ? `color-mix(in srgb, ${hex} 15%, transparent)`
        : hex
  const background: Record<string, string> = gradient
    ? {
        '--accent-card-gradient': `linear-gradient(135deg, ${fill(color)}, ${fill(gradient)})`,
        '--accent-card-surface': 'transparent'
      }
    : {}

  if (style !== 'solid') {
    const overlay = (amount: number): string => `color-mix(in srgb, var(--color-primary-text) ${amount}%, transparent)`
    return {
      '--accent-card-bg': fill(base),
      ...background,
      '--accent-card-tertiary': overlay(12),
      '--accent-card-quaternary': overlay(20),
      '--accent-card-border':
        style === 'glass' ? `color-mix(in srgb, color-mix(in srgb, ${base} 40%, white) 55%, transparent)` : overlay(28),
      '--accent-card-text-secondary': overlay(80)
    } as CSSProperties
  }

  const text = gradient ? readableTextColor(color, gradient) : readableTextColor(color)
  const mix = (amount: number): string => `color-mix(in srgb, ${base} ${100 - amount}%, ${text})`
  return {
    '--accent-card-bg': base,
    ...background,
    '--accent-card-tertiary': mix(12),
    '--accent-card-quaternary': mix(20),
    '--accent-card-border': mix(28),
    '--accent-card-text': text,
    '--accent-card-text-secondary': `color-mix(in srgb, ${text} 72%, ${base})`
  } as CSSProperties
}

export function hexToHsv(hex: string): Hsv {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const delta = max - Math.min(r, g, b)
  let h = 0
  if (delta) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
  }
  return { h: (h * 60 + 360) % 360, s: max ? delta / max : 0, v: max }
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number): number => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return `#${[f(5), f(3), f(1)]
    .map((c) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`
}
