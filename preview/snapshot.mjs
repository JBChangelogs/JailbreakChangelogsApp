// Saves the public API responses the preview replays, so values, dupes and profiles are current on each build.
import { readFileSync, writeFileSync } from 'node:fs'

const API = 'https://api.jailbreakchangelogs.com'
const INV = 'https://inventories.jailbreakchangelogs.com'

// Discord usernames shown in the messages and trades scenes; the first is the signed-in account.
const PEOPLE = ['jailbreakchangelogs', 'senchatf', 'truesmyke', 'kas_dev', 'pikachuwolverine', 'fliktem', 'turtletrevor123', 'aimnice123', 'panqz3']
const DUPE_USER = { username: 'PeachPayload748', id: '176754054' }

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
      body: JSON.stringify({ userIds: [Number(DUPE_USER.id), ...ownerIds].slice(0, 100) })
    })
  }
}

writeFileSync(new URL('app/snapshot.json', import.meta.url), JSON.stringify(snapshot))
// Every enabled theme, for the app (which asks /v2/themes) and the showcase's tabs and backdrop.
const themes = await get(`${API}/v2/themes`)
writeFileSync(new URL('app/themes.json', import.meta.url), JSON.stringify(themes))
console.log(`snapshot: ${themes.length} themes, ${snapshot.people.length} people, ${snapshot.routes[`${API}/v2/items/partial`].length} items, ${dupes.length} dupes`)
