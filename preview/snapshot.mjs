// Saves the public API responses the preview replays, so values, dupes and profiles are current on each build.
import { readFileSync, writeFileSync } from 'node:fs'

const API = 'https://api.jailbreakchangelogs.com'
const INV = 'https://inventories.jailbreakchangelogs.com'

// Discord usernames shown in the messages and trades scenes; the first is the signed-in account.
const PEOPLE = ['jailbreakchangelogs', 'senchatf', 'truesmyke', 'kas_dev', 'pikachuwolverine', 'fliktem', 'turtletrevor123', 'aimnice123', 'panqz3']
const DUPE_USER = { username: 'PeachPayload748', id: '176754054' }
const TRADE_USER = '120276120'
// One page per list, under the page size, so the app sees no further pages to load.
const TRADE_PAGE = 24

async function get(url, init) {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

// Same fields the app asks for, read from its source so the two can't drift.
const useItems = readFileSync(new URL('../src/renderer/src/hooks/useItems.ts', import.meta.url), 'utf8')
const itemFields = [...useItems.match(/PARTIAL_FIELDS = \[([^\]]+)\]/)[1].matchAll(/'(\w+)'/g)].map((m) => m[1])

const ids = []
for (const name of PEOPLE) {
  const hits = await get(`${API}/v2/users/search?query=${encodeURIComponent(name)}&limit=5`)
  const hit = hits.find((u) => u.username === name)
  if (!hit) throw new Error(`No user named ${name}`)
  ids.push(hit.id)
}
const profiles = await get(`${API}/v2/users/batch?ids=${ids.join(',')}`)
const byId = Array.isArray(profiles) ? profiles : Object.values(profiles)

const dupes = await get(`${INV}/users/dupes?id=${DUPE_USER.id}`)
const ownerIds = [...new Set(dupes.map((d) => Number(d.latest_owner)).filter(Boolean))]

const tradesUrl = `${INV}/trades/user/${TRADE_USER}`
const tradePage = await get(`${tradesUrl}?limit=25&nocache=false`)
const trades = { completed: tradePage.completed.slice(0, TRADE_PAGE), pending: tradePage.pending.slice(0, TRADE_PAGE) }
const activity = await get(`${tradesUrl}/activity?days=365`)
const busiestDay = Object.entries(activity.days).sort((a, b) => b[1] - a[1])[0]?.[0]
const dayUrl = `${tradesUrl}/day?date=${busiestDay}&nocache=false`
const day = busiestDay ? await get(dayUrl) : { completed: [], pending: [] }
const shownTrades = [...new Map([...trades.completed, ...trades.pending, ...day.completed, ...day.pending].map((t) => [t.trade_id, t])).values()]
const tradeDetails = await Promise.all(
  shownTrades.map(async (t) => [`${INV}/trades/${t.trade_id}`, await get(`${INV}/trades/${t.trade_id}?nocache=false`)])
)
const partnerIds = [...new Set(shownTrades.map((t) => Number(t.counterparty_user_id)))]

const snapshot = {
  people: ids.map((id) => byId.find((u) => u.id === id)),
  // Keyed by full URL, or by URL without the query string to answer any query.
  routes: {
    [`${API}/v2/items/partial`]: await get(`${API}/v2/items/partial?fields=${itemFields.join(',')}`),
    // The Values screen pages through the server's sorting and filtering, so its pages are saved by full URL.
    ...Object.fromEntries(await Promise.all(
      ['', '&filter=name-vehicles'].flatMap((filter) => [1, 2].map(async (page) => {
        const url = `${API}/v2/items?page=${page}&sort=cash-desc${filter}`
        return [url, await get(url)]
      }))
    )),
    [`${API}/v2/emojis/string`]: await get(`${API}/v2/emojis/string`),
    [`${API}/v2/monitors/Robbery%20Tracking%20Bots`]: await get(`${API}/v2/monitors/Robbery%20Tracking%20Bots`),
    [`${INV}/servers/regions/common`]: await get(`${INV}/servers/regions/common`),
    [`${INV}/dupes/search/owners`]: await get(`${INV}/dupes/search/owners?query=${DUPE_USER.username}&limit=15`),
    [`${INV}/users/dupes`]: dupes,
    [`${INV}/proxy/users`]: await get(`${INV}/proxy/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [DUPE_USER.username], excludeBannedUsers: false })
    }),
    [`${INV}/proxy/users/v2`]: await get(`${INV}/proxy/users/v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: [...new Set([Number(DUPE_USER.id), Number(TRADE_USER), ...partnerIds, ...ownerIds])].slice(0, 100) })
    }),
    [tradesUrl]: trades,
    [`${tradesUrl}/activity`]: activity,
    [`${tradesUrl}/summary`]: await get(`${tradesUrl}/summary?nocache=false`),
    ...(busiestDay ? { [dayUrl]: day } : {}),
    ...Object.fromEntries(tradeDetails)
  }
}

writeFileSync(new URL('app/snapshot.json', import.meta.url), JSON.stringify(snapshot))
// Every enabled theme, for the app (which asks /v2/themes) and the showcase's tabs and backdrop.
const themes = await get(`${API}/v2/themes`)
writeFileSync(new URL('app/themes.json', import.meta.url), JSON.stringify(themes))
console.log(`snapshot: ${themes.length} themes, ${snapshot.people.length} people, ${snapshot.routes[`${API}/v2/items/partial`].length} items, ${dupes.length} dupes, ${tradeDetails.length} trades`)
