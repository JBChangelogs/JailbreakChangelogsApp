import type { UserProfile } from './user'

export interface VipServer {
  id: number
  link: string
  rules: string
  expires: string
  created_at: number | string
}

export interface VipServerWithOwner extends VipServer {
  user: UserProfile & { premiumtype?: number }
}

export interface VipServerPage {
  total: number
  items: VipServerWithOwner[]
  page: number
  total_pages: number
  size: number
}

export interface VipServerPayload {
  link: string
  rules: string
  expires: string
}

const ALLOWED_RULES_HOSTS = ['roblox.com', 'jailbreakchangelogs.com', 'discord.com', 'discord.gg']
const MAX_RULES_LENGTH = 200
const DAY_MS = 86_400_000

export function validateServerLink(link: string): string | null {
  const trimmed = link.trim()
  if (!trimmed) return 'Please enter a server link'
  try {
    const url = new URL(trimmed)
    if (url.protocol === 'https:' && url.hostname === 'www.roblox.com' && url.pathname === '/share' && url.searchParams.get('code')) {
      return null
    }
  } catch {
  }
  return 'Server link must start with: https://www.roblox.com/share?code='
}

export function normaliseRules(rules: string): string {
  const cleaned = rules
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return cleaned || 'N/A'
}

export function validateServerRules(rules: string): string | null {
  if (rules.length > MAX_RULES_LENGTH) return `Rules can be at most ${MAX_RULES_LENGTH} characters`
  for (const raw of rules.match(/https?:\/\/[^\s]+/gi) ?? []) {
    const url = raw.replace(/[),.;!?]+$/, '')
    try {
      const host = new URL(url).hostname
      if (ALLOWED_RULES_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) continue
    } catch {
    }
    return 'Server rules contain an unsafe link. Only Roblox, Discord, and JailbreakChangelogs links are allowed.'
  }
  return null
}

export function minExpiryDate(now = Date.now()): Date {
  const date = new Date(now + 7 * DAY_MS)
  date.setHours(0, 0, 0, 0)
  return date
}

export function validateServerExpiry(expiresMs: number | null, now = Date.now()): string | null {
  if (expiresMs == null) return null
  if (Number.isNaN(expiresMs)) return 'Please pick a valid expiry date'
  if (expiresMs < minExpiryDate(now).getTime()) return 'Expiry must be at least 7 days from now'
  return null
}

export function toExpiresField(expiresMs: number | null, now = Date.now()): string {
  if (expiresMs == null || expiresMs - now > 365 * DAY_MS) return 'Never'
  return String(Math.floor(expiresMs / 1000))
}

export function parseServerTimestamp(value: string | number): number | null {
  if (value === 'Never') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return n > 1e10 ? n : n * 1000
}

const LINK_PATTERN =
  /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:gg|com|net|org|me|io|gl|ly|co|xyz|app|dev|chat|tv)(?:\/\S*)?\b/gi

export function displayRules(rules: string): string | null {
  if (!rules || rules === 'N/A') return null
  return rules.replace(LINK_PATTERN, '[REDACTED]')
}
