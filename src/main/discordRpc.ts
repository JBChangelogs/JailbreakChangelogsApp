import { Client } from '@xhayper/discord-rpc'
import { loadToken } from './auth'
import { apiFetch } from './apiFetch'
import type { RobloxActivityEvent } from './robloxGameWatcher'
import { KNOWN_ROBLOX_GAMES } from '../shared/robloxGames'
import type { RichPresencePreferenceKey } from '../shared/richPresence'

export type { RichPresencePreferenceKey }

const DISCORD_CLIENT_ID = '1281308669299920907'
const LOCATION_REFRESH_MS = 10_000
const JAILBREAK_PLACE_ID = '606849621'
const ROBLOX_SMALL_IMAGE_KEY = 'controller2'

let client: Client | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null
let sessionStartTimestamp: number | null = null
let robloxActivity: { placeId: string; jobId: string | null } | null = null

const richPresencePreferences: Record<RichPresencePreferenceKey, boolean> = {
  rich_presence_enabled: true,
  rich_presence_show_details: true,
  rich_presence_show_state: true,
  rich_presence_show_roblox_badge: true,
  rich_presence_show_join_button: true,
  rich_presence_show_website_button: true
}

export function setRichPresencePreference(key: RichPresencePreferenceKey, value: boolean): void {
  richPresencePreferences[key] = value
  updatePresence()
}

interface LocationResponse {
  location: string | null
  app_location: string | null
}

interface OwnIdentity {
  discordId: string | null
  robloxId: string | null
}

const EMPTY_IDENTITY: OwnIdentity = { discordId: null, robloxId: null }
const STATIC_LOCATIONS: Record<string, string> = {
  '/': 'browsing the home page',
  '/values': 'checking the value list',
  '/values/calculator': 'using the trade calculator',
  '/faq': 'viewing the FAQ',
  '/privacy': 'reading the privacy policy',
  '/tos': 'reading the terms of service',
  '/contributors': 'viewing the contributors page',
  '/supporting': 'viewing ways to support us',
  '/servers': 'browsing trading servers',
  '/bot': 'viewing the Discord bot page',
  '/settings': 'viewing settings',
  '/trading': 'browsing the trading hub',
  '/hyperchrome-pity': 'tracking HyperChrome pity',
  '/users': 'browsing users',
  '/testimonials': 'reading testimonials',
  '/robberies': 'viewing robberies',
  '/bounties': 'viewing bounties',
  '/inventories': 'checking someone\'s inventory',
  '/messages': 'viewing messages',
  '/og': 'using the OG finder',
  '/dupes': 'viewing the dupe list',
  '/changelogs/timeline': 'viewing the changelog timeline',
  '/items/suggestions': 'viewing item suggestions'
}

function humanizeSlug(slug: string): string {
  if (slug === 'dupefinder') return 'Dupe Finder'
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatLocation(
  path: string | null | undefined,
  identity: OwnIdentity = EMPTY_IDENTITY
): string | null {
  const phrase = resolveLocationPhrase(path, identity)
  return phrase ? phrase.charAt(0).toUpperCase() + phrase.slice(1) : null
}

function resolveLocationPhrase(
  path: string | null | undefined,
  identity: OwnIdentity
): string | null {
  if (!path) return null
  const clean = path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'

  const exact = STATIC_LOCATIONS[clean]
  if (exact) return exact

  const segments = clean.split('/').filter(Boolean)

  if (segments[0] === 'changelogs' && segments[1]) {
    return `viewing changelog #${segments[1]}`
  }
  if (segments[0] === 'items' && segments[1] === 'changelogs' && segments[2]) {
    return `viewing item changelog #${segments[2]}`
  }
  if (segments[0] === 'items' && segments[1] === 'suggestions' && segments[2]) {
    return `looking at item suggestion #${segments[2]}`
  }
  if (segments[0] === 'seasons' && segments[1]) {
    return `checking season ${segments[1]}`
  }
  if (segments[0] === 'trading' && segments[1] === 'ad' && segments[2]) {
    return `viewing trade ad #${segments[2]}`
  }
  if (segments[0] === 'values' && segments[1]) {
    return `checking ${humanizeSlug(segments[1])}'s value`
  }
  if (segments[0] === 'inventories' && segments[1]) {
    return segments[1] === identity.robloxId
      ? 'checking their own inventory'
      : "checking someone's inventory"
  }
  if ((segments[0] === 'ogs' || segments[0] === 'og') && segments[1]) {
    return segments[1] === identity.robloxId ? 'checking their own OGs' : "checking someone's OGs"
  }
  if (segments[0] === 'users' && segments[1]) {
    return segments[1] === identity.discordId ? 'viewing their own profile' : 'viewing a profile'
  }

  return 'browsing the site'
}

function loadUserLocation(token: string): Promise<LocationResponse | null> {
  return apiFetch('https://api.jailbreakchangelogs.com/v2/users/me/location', {
    headers: { Authorization: token }
  })
    .then((response) => response.json() as Promise<LocationResponse>)
    .catch((error: Error) => {
      console.warn('[discord-rpc] failed to load user location:', error.message)
      return null
    })
}

let cachedIdentity: { token: string; identity: OwnIdentity } | null = null

function loadOwnIdentity(token: string): Promise<OwnIdentity> {
  if (cachedIdentity?.token === token) return Promise.resolve(cachedIdentity.identity)

  return apiFetch('https://api.jailbreakchangelogs.com/v2/users/me', {
    headers: { Authorization: token }
  })
    .then(
      (response) =>
        response.json() as Promise<{ id?: string; roblox?: { roblox_id?: string } | null }>
    )
    .then((data) => {
      const identity: OwnIdentity = {
        discordId: data.id ?? null,
        robloxId: data.roblox?.roblox_id ?? null
      }
      cachedIdentity = { token, identity }
      return identity
    })
    .catch((error: Error) => {
      console.warn('[discord-rpc] failed to load own identity:', error.message)
      return EMPTY_IDENTITY
    })
}

function robloxActivityExtras(): { smallImageKey?: string; smallImageText?: string; joinButton?: { label: string; url: string } } {
  const gameName = robloxActivity ? KNOWN_ROBLOX_GAMES[robloxActivity.placeId] : undefined
  if (!robloxActivity || !gameName) return {}

  const joinButton =
    robloxActivity.placeId === JAILBREAK_PLACE_ID && robloxActivity.jobId
      ? {
        label: 'Join Server',
        url: `roblox://experiences/start?placeId=${robloxActivity.placeId}&gameInstanceId=${robloxActivity.jobId}`
      }
      : undefined

  return { smallImageKey: ROBLOX_SMALL_IMAGE_KEY, smallImageText: `Inside ${gameName}`, joinButton }
}

function updatePresence(): void {
  if (!client?.isConnected) return

  if (!richPresencePreferences.rich_presence_enabled) {
    client.user
      ?.clearActivity()
      .catch((error: Error) => console.warn('[discord-rpc] failed to clear activity:', error.message))
    return
  }

  const { smallImageKey, smallImageText, joinButton } = robloxActivityExtras()
  const buttons = [
    ...(joinButton && richPresencePreferences.rich_presence_show_join_button ? [joinButton] : []),
    ...(richPresencePreferences.rich_presence_show_website_button
      ? [{ label: 'Visit website', url: 'https://jailbreakchangelogs.com' }]
      : [])
  ]
  const badgeKey = richPresencePreferences.rich_presence_show_roblox_badge ? smallImageKey : undefined
  const badgeText = richPresencePreferences.rich_presence_show_roblox_badge ? smallImageText : undefined

  const token = loadToken()
  if (!token) {
    client.user
      ?.setActivity({
        smallImageKey: badgeKey,
        smallImageText: badgeText,
        startTimestamp: sessionStartTimestamp ?? Date.now(),
        buttons
      })
      .catch((error: Error) => console.warn('[discord-rpc] failed to set activity:', error.message))
    return
  }

  Promise.all([loadUserLocation(token), loadOwnIdentity(token)]).then(([data, identity]) => {
    if (!client?.isConnected) return
    client.user
      ?.setActivity({
        details: richPresencePreferences.rich_presence_show_details
          ? (formatLocation(data?.location, identity) ?? undefined)
          : undefined,
        state:
          richPresencePreferences.rich_presence_show_state && data?.app_location
            ? `${humanizeSlug(data.app_location)} (App)`
            : undefined,
        smallImageKey: badgeKey,
        smallImageText: badgeText,
        startTimestamp: sessionStartTimestamp ?? Date.now(),
        buttons
      })
      .catch((error: Error) => console.warn('[discord-rpc] failed to set activity:', error.message))
  })
}

export function refreshDiscordPresence(): void {
  updatePresence()
}
export function setRobloxActivity(event: RobloxActivityEvent): void {
  robloxActivity = event.placeId ? { placeId: event.placeId, jobId: event.jobId } : null
  updatePresence()
}

const RECONNECT_BASE_MS = 2_000
const RECONNECT_MAX_MS = 30_000
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelay = RECONNECT_BASE_MS
let intentionallyDisconnected = false

function cleanupClient(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  client = null
}

function scheduleReconnect(): void {
  if (intentionallyDisconnected || reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectDiscordRpc()
  }, reconnectDelay)
  reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS)
}

export function connectDiscordRpc(): void {
  if (client) return
  intentionallyDisconnected = false

  const newClient = new Client({ clientId: DISCORD_CLIENT_ID })
  client = newClient

  newClient.on('ready', () => {
    reconnectDelay = RECONNECT_BASE_MS
    sessionStartTimestamp = Date.now()
    updatePresence()
    refreshTimer = setInterval(updatePresence, LOCATION_REFRESH_MS)
  })

  newClient.on('disconnected', () => {
    cleanupClient()
    scheduleReconnect()
  })

  newClient.login().catch((error: Error) => {
    console.warn('[discord-rpc] could not connect (Discord probably not running):', error.message)
    cleanupClient()
    scheduleReconnect()
  })
}

export async function disconnectDiscordRpc(): Promise<void> {
  intentionallyDisconnected = true
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (!client) return
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  const current = client
  client = null
  sessionStartTimestamp = null
  try {
    if (current.isConnected) {
      await current.user?.clearActivity()
    }
    await current.destroy()
  } catch {
  }
}
