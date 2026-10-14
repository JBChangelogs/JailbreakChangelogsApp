// Stands in for everything outside the renderer: the Electron preload bridge, the API and the sockets.
// Public data comes from snapshot.json (npm run preview:snapshot); signed-in data is the example below.
import snapshot from './snapshot.json'
import type { UserProfile } from '@shared/user'
import type { MessageItem } from '@shared/messages'
import type { Item } from '@shared/item'
import type { TradeAd, TradeItemWire } from '@shared/trading'
import type { RobberyData, ServerRegionData } from '@shared/robbery'
import { parseCashValue } from '@renderer/lib/itemValueUtils'

const API = 'https://api.jailbreakchangelogs.com'
const INV = 'https://inventories.jailbreakchangelogs.com'
const now = Math.floor(Date.now() / 1000)
const ago = (s: number): number => now - s

// Focus moves inside the app (popovers handing focus back, inputs) would otherwise scroll the page embedding the preview.
const focus = HTMLElement.prototype.focus
HTMLElement.prototype.focus = function (options?: FocusOptions) {
  focus.call(this, { ...options, preventScroll: true })
}

// The tour's clicks are synthetic, so Chrome treats focus they cause (a popover focusing its first item)
// as keyboard focus and draws focus rings a mouse user never sees. The tour never uses the keyboard.
document.head.insertAdjacentHTML('beforeend', '<style>:focus-visible { outline: none !important; }</style>')

// Fresh state on every load, in the theme the showcase asked for.
localStorage.clear()
const params = new URLSearchParams(location.search)
const theme = params.get('theme')
if (theme === 'light' || theme === 'amoled') localStorage.setItem('theme', theme)
// The tour opens the app straight on the chapter's tab.
localStorage.setItem('jbcl:last-active-tab', params.get('tab') ?? 'messages')

/* ---------- Example data ---------- */

const people = snapshot.people as unknown as UserProfile[]
const [me, sencha, smyke, kas, pika, flik, trevor] = people
const routes = snapshot.routes as Record<string, unknown>
const items = routes[`${API}/v2/items/partial`] as Item[]
const online = new Set([me, sencha, smyke, flik].map((p) => p.id))
for (const p of people) p.presence = { status: online.has(p.id) ? 'Online' : 'Offline', last_updated: now }
localStorage.setItem('jbcl:last-selected-conversation-id', sencha.id)
// Keep a joined robbery on screen so the tour can show it.
localStorage.setItem('jbcl:hide-joined-servers', 'false')

let nextId = 1000
function msg(from: UserProfile, to: UserProfile, secondsAgo: number, content: string, extra: Partial<MessageItem> = {}): MessageItem {
  return { id: String(nextId++), parent_id: null, sender_id: from.id, receiver_id: to.id, content, metadata: null, created_at: ago(secondsAgo), read_at: ago(secondsAgo), ...extra }
}

// Some names are shared (the Arachnid is also a rim), so prefer the vehicle.
const byName = (name: string): Item =>
  (items.find((i) => i.name === name && i.type === 'Vehicle') ?? items.find((i) => i.name === name)) as Item
const millions = (...names: string[]): string => `${Math.round(names.reduce((t, n) => t + parseCashValue(byName(n).cash_value), 0) / 1e6)}m`

const TRADE_ID = 4821
const OFFER_ID = 9312
const asked = msg(sencha, me, 960, 'I have a Torpedo and a Beam Hybrid. would that work?')
const threads = new Map<string, MessageItem[]>([
  [sencha.id, [
    msg(sencha, me, 1080, 'hey, saw your trade ad for the Javelin. still available?'),
    msg(me, sencha, 1020, 'yep! looking for a couple vehicles or a hyperchrome'),
    asked,
    msg(me, sencha, 900, 'checking values real quick'),
    msg(me, sencha, 720, `that's ${millions('Torpedo', 'Beam Hybrid')} for my ${millions('Javelin')}, works for me`, { parent_id: asked.id }),
    msg(sencha, me, 540, 'deal, sending the offer now'),
    msg(sencha, me, 420, '', { metadata: { type: 'offer_accepted', trade: TRADE_ID, offer: OFFER_ID } })
  ]],
  [smyke.id, [msg(smyke, me, 1800, 'you still need a Brulee?', { read_at: null }), msg(smyke, me, 1750, 'can do it for a Torpedo', { read_at: null })]],
  [kas.id, [msg(me, kas, 7200, 'ty for the help earlier')]],
  [pika.id, [msg(pika, me, 86400, 'gg')]],
  [flik.id, [msg(flik, me, 2 * 86400, 'lmk if you want the HyperRed')]],
  [trevor.id, [msg(trevor, me, 3 * 86400, 'are you selling the Arachnid?', { read_at: null })]]
])

function wire(name: string): TradeItemWire {
  const it = byName(name)
  return { id: String(it.id), name: it.name, type: it.type, info: { cash_value: it.cash_value, duped_value: it.duped_value, trend: it.trend, demand: it.demand } }
}
function ad(id: number, author: UserProfile, hoursAgo: number, offering: string[], requesting: string[], note: string | null = null): TradeAd {
  return {
    id, author: author.id, note, created_at: ago(hoursAgo * 3600), expires: ago(hoursAgo * 3600) + 24 * 3600,
    offering: offering.map(wire), requesting: requesting.map(wire),
    user: author as TradeAd['user']
  }
}
const ads = [
  ad(TRADE_ID + 3, flik, 2, ['Javelin'], ['HyperRed Level 5', 'Beam Hybrid'], 'Looking for HyperRed + adds. Can add a little for the right offer.'),
  ad(TRADE_ID + 2, trevor, 5, ['Torpedo', 'Arachnid'], ['Javelin']),
  ad(TRADE_ID + 1, smyke, 20, ['Molten M12', 'Brulee'], ['Torpedo'], 'Quick trade, online now'),
  ad(TRADE_ID, me, 23, ['Javelin'], ['Torpedo', 'Beam Hybrid'])
]
const acceptedOffer = { id: OFFER_ID, trade: TRADE_ID, offering: ['Torpedo', 'Beam Hybrid'].map(wire), requesting: ['Javelin'].map(wire), status: 1, created_at: ago(500) }

const region = (city: string, regionName: string, country: string, countryCode: string): ServerRegionData =>
  ({ status: 'success', city, regionName, country, countryCode, region: '', zip: '', lat: 0, lon: 0, timezone: '', isp: '', org: '', as: '', query: '' })
function robbery(marker_name: string, name: string, status: number, minutesAgo: number, crims: number, cops: number, place: ServerRegionData, metadata: RobberyData['metadata'] = null): RobberyData {
  const job_id = crypto.randomUUID()
  const players = [...Array(crims + cops)].map((_, i) => ({ user_id: String(i), username: null, team: i < crims ? 'Criminal' : 'Police', level: 1, has_season_pass: false, money: 0, xp: 0, gamepasses: [] }))
  regions[job_id] = place
  return { marker_name, name, status, progress: null, metadata, job_id, server_time: 19.7, timestamp: ago(minutesAgo * 60), server: { job_id, server_time: 19.7, timestamp: ago(minutesAgo * 60), bot_id: 1, players } }
}
const regions: Record<string, ServerRegionData> = {}
const robberies = [
  robbery('Casino', 'Crown Jewel', 2, 0.2, 6, 3, region('Ashburn', 'Virginia', 'United States', 'US'), { casino_code: '4817', casino_time: now + 154 }),
  robbery('Bank', 'Rising City Bank', 1, 0.6, 9, 4, region('Frankfurt', 'Hesse', 'Germany', 'DE')),
  robbery('CargoPlane', 'Cargo Plane', 1, 1, 4, 2, region('Dallas', 'Texas', 'United States', 'US'), { plane_time: now + 131 }),
  robbery('Museum', 'Museum', 1, 2, 7, 5, region('Amsterdam', 'North Holland', 'Netherlands', 'NL')),
  robbery('Mansion', 'Mansion', 2, 3, 11, 6, region('Los Angeles', 'California', 'United States', 'US')),
  robbery('PowerPlant', 'Power Plant', 1, 4, 3, 1, region('Singapore', 'Central', 'Singapore', 'SG')),
  robbery('MoneyTruck', 'Bank Truck', 1, 5, 5, 2, region('Warsaw', 'Mazovia', 'Poland', 'PL')),
  robbery('Jewelry', 'Jewelry Store', 1, 6, 8, 4, region('Sydney', 'New South Wales', 'Australia', 'AU'))
]

/* ---------- Routes ---------- */

type Handler = (url: URL, body: unknown, match: RegExpMatchArray) => unknown
const conversation = (id: string): MessageItem[] => threads.get(id) ?? []
const handlers: [string, RegExp, Handler][] = [
  ['GET', /^\/v2\/users\/me$/, () => me],
  ['GET', /^\/v2\/users\/me\/experiments$/, () => ({ experiments: { app_available: 'treatment' } })],
  ['GET', /^\/v2\/users\/me\/blocked-users$/, () => ({ blocked_users: [] })],
  ['GET', /^\/v2\/users\/me\/settings$/, () => ({})],
  ['GET', /^\/v2\/users\/batch$/, (u) => people.filter((p) => u.searchParams.get('ids')?.split(',').includes(p.id))],
  ['GET', /^\/v2\/users\/(\d+)$/, (_, __, m) => people.find((p) => p.id === m[1])],
  ['GET', /^\/v2\/conversations$/, () => {
    const conversations = [...threads].map(([id, list]) => ({
      recipient_id: id, message: list[list.length - 1], message_count: list.length,
      unread_count: list.filter((m) => m.sender_id === id && !m.read_at).length
    })).sort((a, b) => b.message.created_at - a.message.created_at)
    return { conversations, total_conversations: conversations.length }
  }],
  ['GET', /^\/v2\/conversations\/unread-count$/, () => ({ unread: [...threads.values()].flat().filter((m) => m.sender_id !== me.id && !m.read_at).length })],
  ['GET', /^\/v2\/conversations\/(\d+)\/messages$/, (_, __, m) => {
    const list = conversation(m[1])
    for (const x of list) x.read_at ??= now
    return { items: [...list].reverse(), total: list.length, page: 1, total_pages: 1, size: 50 }
  }],
  ['POST', /^\/v2\/conversations\/(\d+)\/messages$/, (_, body, m) => {
    const { content, parent_id = null, metadata = null } = body as Partial<MessageItem>
    const sent: MessageItem = { id: String(nextId++), sender_id: me.id, receiver_id: m[1], content: content ?? '', parent_id, metadata, created_at: Math.floor(Date.now() / 1000), read_at: null }
    threads.set(m[1], [...conversation(m[1]), sent])
    return { success: true, message: sent }
  }],
  ['GET', /^\/v2\/notifications\/unread-count$/, () => ({ unread_count: 0 })],
  ['GET', /^\/v2\/notifications(\/history)?$/, () => ({ items: [], total: 0, page: 1, total_pages: 0, size: 5 })],
  ['GET', /^\/v2\/trades$/, (u) => {
    const mine = u.searchParams.get('user')
    const list = ads.filter((a) => !mine || a.author === mine)
    return { items: list, total: list.length, page: 1, total_pages: 1, size: 20 }
  }],
  ['GET', /^\/v2\/trades\/(\d+)$/, (_, __, m) => ads.find((a) => a.id === Number(m[1]))],
  ['GET', /^\/v2\/trades\/(\d+)\/offers$/, () => [acceptedOffer]],
  ['GET', /^\/v2\/trades\/(\d+)\/offers\/(\d+)$/, () => acceptedOffer],
  ['GET', /^\/v2\/users\/me\/join-history$/, () => ({ items: [], total: 0, page: 1, total_pages: 0, size: 50 })],
  ['GET', /^\/servers\/regions$/, (u) => Object.fromEntries((u.searchParams.get('ids') ?? '').split(',').map((id) => [id, regions[id] ?? null]))]
]

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

const realFetch = window.fetch.bind(window)
window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = new URL(input instanceof Request ? input.url : String(input))
  if (url.origin !== API && url.origin !== INV) return realFetch(input, init)
  await new Promise((r) => setTimeout(r, 120))
  const method = (init?.method ?? 'GET').toUpperCase()
  for (const [m, pattern, handle] of handlers) {
    const match = m === method && url.pathname.match(pattern)
    if (!match) continue
    const data = handle(url, init?.body ? JSON.parse(String(init.body)) : null, match)
    return data === undefined ? json({ message: 'Not found' }, 404) : json(data)
  }
  const snap = routes[url.href] ?? routes[url.origin + url.pathname]
  if (snap !== undefined) return json(snap)
  console.warn('[preview] no mock for', method, url.href)
  return json({ message: 'Not available in the preview' }, 404)
}

/* ---------- Sockets ---------- */

class FakeSocket extends EventTarget {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  readyState = FakeSocket.CONNECTING
  onopen: ((e: Event) => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onclose: ((e: CloseEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null

  constructor(readonly url: string) {
    super()
    setTimeout(() => {
      if (this.readyState !== FakeSocket.CONNECTING) return
      this.readyState = FakeSocket.OPEN
      sockets.add(this)
      this.fire(new Event('open'))
      if (url.startsWith(`${INV.replace('https', 'wss')}/tracker`)) {
        this.push({ action: 'recent_robberies', data: robberies })
        this.push({ action: 'join_history_sync', servers: {} })
      }
    }, 50)
  }

  private fire(e: Event): void {
    this.dispatchEvent(e)
    ;(this as unknown as Record<string, ((e: Event) => void) | null>)[`on${e.type}`]?.(e)
  }

  push(data: unknown): void {
    this.fire(new MessageEvent('message', { data: JSON.stringify(data) }))
  }

  send(): void {}

  close(code = 1000): void {
    if (this.readyState === FakeSocket.CLOSED) return
    this.readyState = FakeSocket.CLOSED
    sockets.delete(this)
    this.fire(new CloseEvent('close', { code }))
  }
}
const sockets = new Set<FakeSocket>()
window.WebSocket = FakeSocket as unknown as typeof WebSocket

/* ---------- Electron bridge ---------- */

const subscribers = new Map<string, Set<(value: unknown) => void>>()
const bridge: Record<string, unknown> = {
  'auth.getToken': async () => 'preview',
  'window.isMaximized': async () => false,
  'scanner.status': async () => ({ available: true, provider: 'preview' }),
  'scanner.getAuto': async () => ({ enabled: false, area: null }),
  'scanner.snip': async () => null,
  'analytics.isEnabled': async () => false
}
// Anything not listed resolves to nothing, and on*(callback) subscribes, so new preload calls don't break the preview.
function stub(path: string): unknown {
  return new Proxy(() => {}, {
    get: (_, key) => {
      const next = path ? `${path}.${String(key)}` : String(key)
      return bridge[next] ?? stub(next)
    },
    apply: (_, __, [callback]) => {
      if (!/(^|\.)on[A-Z]\w*$/.test(path)) return Promise.resolve(undefined)
      const set = subscribers.get(path) ?? new Set()
      subscribers.set(path, set.add(callback))
      return () => set.delete(callback)
    }
  })
}
Object.assign(window, { api: stub(''), electron: { process: { platform: 'win32' } } })

/* ---------- Controls for the tour (preview/tour.ts) ---------- */

const realtime = (action: string, data: unknown): void => {
  for (const s of sockets) if (s.url.startsWith(`${API.replace('https', 'wss')}/realtime`)) s.push({ action, data })
}
export const preview = {
  me,
  sencha,
  // The other side of the open conversation: a typing indicator, then a reply.
  typing: (from: UserProfile) => realtime('typing', { user_id: from.id }),
  receive(from: UserProfile, content: string, metadata: Record<string, unknown> | null = null) {
    const m = msg(from, me, 0, content, { metadata })
    threads.set(from.id, [...conversation(from.id), m])
    realtime('message_received', m)
  },
  robloxActivity: (placeId: string | null, jobId: string | null = null) =>
    subscribers.get('onRobloxActivityChanged')?.forEach((cb) => cb({ placeId, jobId, game: placeId ? 'Jailbreak' : null }))
}
Object.assign(window, { preview })
