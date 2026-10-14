// Drives the real app in the iframe: moves a fake cursor, clicks, types and scrolls through each feature.
// Targets are found by label, placeholder or text, so the tour follows the app as long as those stay put.
import type { preview as Controls } from './app/mock'
import themes from './app/themes.json'

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document): T => r.querySelector(s) as T
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

const stage = $('#stage'), win = $('#win'), cursor = $('#cursor'), tip = $('#tip')
let frame = $<HTMLIFrameElement>('#app')
new ResizeObserver(() => {
  const scale = stage.clientWidth / 1280
  win.style.transform = `scale(${scale})`
  stage.style.height = 800 * scale + 'px'
}).observe(stage)

const ARROW = [
  'X', 'XX', 'X.X', 'X..X', 'X...X', 'X....X', 'X.....X', 'X......X', 'X.......X', 'X........X',
  'X.........X', 'X......XXXXX', 'X...X..X', 'X..XX..X', 'X.X  X..X', 'XX   X..X', 'X     X..X', '      X..X', '       XX'
]
cursor.innerHTML = ARROW.flatMap((row, y) => [...row].map((c, x) =>
  c === ' ' ? '' : `<rect x="${x}" y="${y}" width="1" height="1" fill="${c === 'X' ? '#000' : '#fff'}"/>`)).join('')
let cx = 900, cy = 600
function placeCursor(x: number, y: number): void {
  cx = Math.round(x); cy = Math.round(y)
  cursor.style.transform = `translate(${cx}px, ${cy}px)`
}
placeCursor(cx, cy)

/* ---------- Helpers (all coordinates are the app's own 1280x800 viewport) ---------- */

let gen = 0
class Stop extends Error {}
const sleep = (ms: number, g: number): Promise<void> =>
  new Promise((res, rej) => setTimeout(() => (g === gen ? res() : rej(new Stop())), reduced ? Math.min(ms, 400) : ms))
const doc = (): Document => frame.contentDocument as Document
const app = (): Window & { preview: typeof Controls } => frame.contentWindow as Window & { preview: typeof Controls }

async function find(what: string | (() => Element | null | undefined), g: number, timeout = 8000): Promise<HTMLElement> {
  const lookup = typeof what === 'string' ? () => doc().querySelector(what) : what
  for (const end = Date.now() + timeout; Date.now() < end; await sleep(100, g)) {
    const el = lookup()
    if (el) return el as HTMLElement
  }
  throw new Error(`[tour] not found: ${what}`)
}
const button = (text: string, root: ParentNode = doc()): HTMLElement | undefined =>
  [...root.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent?.trim() === text)
// The biggest scrollable area right of the sidebar.
const mainScroller = (): HTMLElement | undefined =>
  [...doc().querySelectorAll<HTMLElement>('.overflow-y-auto')]
    .filter((el) => el.getBoundingClientRect().left >= 256 && el.scrollHeight > el.clientHeight)
    .sort((a, b) => b.clientHeight - a.clientHeight)[0]

async function moveTo(el: Element, g: number, dx = 0, dy = 0): Promise<void> {
  const r = el.getBoundingClientRect()
  placeCursor(r.left + r.width / 2 + dx, r.top + r.height / 2 + dy)
  await sleep(750, g)
}
function ripple(): void {
  const el = document.createElement('div')
  el.className = 'ripple'
  el.style.left = cx + 'px'; el.style.top = cy + 'px'
  win.append(el)
  setTimeout(() => el.remove(), 500)
}
async function click(el: HTMLElement, g: number): Promise<void> {
  ripple()
  await sleep(140, g)
  el.click()
}
function showTip(el: Element, text: string): void {
  const r = el.getBoundingClientRect()
  tip.textContent = text
  tip.style.left = r.left + r.width / 2 + 'px'; tip.style.top = r.bottom + 8 + 'px'; tip.style.transform = 'translateX(-50%)'
  tip.classList.add('on')
}
const hideTip = (): void => tip.classList.remove('on')
// React tracks input values itself, so set them through the native setter and announce the change.
async function type(el: HTMLInputElement | HTMLTextAreaElement, text: string, g: number, speed = 55): Promise<void> {
  el.focus({ preventScroll: true })
  const setValue = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set!
  for (let i = 1; i <= text.length; i++) {
    setValue.call(el, text.slice(0, i))
    el.dispatchEvent(new (app() as unknown as typeof globalThis).Event('input', { bubbles: true }))
    await sleep(speed + Math.random() * 40, g)
  }
}
const pressEnter = (el: HTMLElement): boolean =>
  el.dispatchEvent(new (app() as unknown as typeof globalThis).KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
async function scrollTo(el: HTMLElement | undefined, top: number | 'end', g: number): Promise<void> {
  el?.scrollTo({ top: top === 'end' ? el.scrollHeight : top, behavior: reduced ? 'auto' : 'smooth' })
  await sleep(1100, g)
}
async function scrollThrough(g: number): Promise<void> {
  const sc = mainScroller()
  if (!sc) return
  await moveTo(sc, g, 120, 60)
  await scrollTo(sc, 'end', g); await sleep(1200, g)
  await scrollTo(sc, 0, g)
}
async function goTab(label: string, g: number): Promise<void> {
  const btn = await find(`button[aria-label="${label}"]`, g)
  if (btn.className.includes('bg-button-info')) return
  await moveTo(btn, g)
  showTip(btn, label); await sleep(450, g)
  await click(btn, g); hideTip()
}

// With a fresh app loading in the background, the cursor goes to the tab in the visible app and clicks
// only once the fresh one is ready, swapping it in on the click, so the old state never shows afterwards.
async function goFreshTab(label: string, g: number, fresh: Promise<HTMLIFrameElement>): Promise<void> {
  fresh.catch(() => {})
  const btn = doc().querySelector<HTMLElement>(`button[aria-label="${label}"]`)
  if (btn) {
    await moveTo(btn, g)
    showTip(btn, label); await sleep(450, g)
  }
  const next = await fresh
  if (btn) { ripple(); await sleep(140, g) }
  hideTip()
  show(next)
}

/* ---------- Scenes ---------- */

const JAILBREAK = '606849621'
const JOB = 'b6f2c1e0-3f5a-4c1e-9a77-2d8e5c4f1a90'

const SCENES: { chapter: string; id: string; tab: string; dur: number; play: (g: number) => Promise<void> }[] = [
  {
    chapter: 'Messages', id: 'messages', tab: 'Messages', dur: 17500,
    async play(g) {
      const box = await find('textarea[placeholder^="Message"]', g) as HTMLTextAreaElement
      await sleep(900, g)
      await moveTo(box, g, -120, 0); await click(box, g)
      await type(box, 'accepted! meet me at the ship', g)
      await sleep(300, g)
      await moveTo(await find('button[aria-label="Send message"]', g), g)
      pressEnter(box)
      await sleep(1000, g)
      // Invites need the app to see you in a game, the way the Roblox watcher reports it.
      const { preview } = app()
      preview.robloxActivity(JAILBREAK, JOB)
      await sleep(900, g)
      // Messages have their own "More options" too; the composer's "+" comes last.
      const more = await find(() => [...doc().querySelectorAll('button[aria-label="More options"]')].at(-1), g)
      await moveTo(more, g); await click(more, g)
      const invite = await find(() => [...doc().querySelectorAll<HTMLElement>('button')].find((b) => b.textContent?.includes('Invite to Game')), g)
      await sleep(500, g)
      // Closing the popover hands focus back to "+" (after its exit animation), which shows the keyboard focus
      // ring and opens its tooltip. Drop that focus once React has seen it, before anything paints.
      more.addEventListener('focusin', () => queueMicrotask(() => more.blur()), { once: true })
      await moveTo(invite, g); await click(invite, g)
      await sleep(1400, g)
      preview.typing(preview.sencha); await sleep(1800, g)
      preview.receive(preview.sencha, 'omw')
      await sleep(2600, g)
      preview.robloxActivity(null)
    }
  },
  {
    chapter: 'Trades', id: 'trades', tab: 'Trades', dur: 10000,
    async play(g) {
      const box = await find('input[placeholder="Search by item name..."]', g) as HTMLInputElement
      await sleep(1200, g)
      await moveTo(box, g, -40, 0); await click(box, g)
      await type(box, 'javelin', g, 90)
      await sleep(1200, g)
      await scrollThrough(g)
    }
  },
  {
    chapter: 'Robberies', id: 'tracker', tab: 'Robbery & Bounty Tracker', dur: 11000,
    async play(g) {
      const join = await find(() => button('Join'), g)
      await sleep(1400, g)
      await scrollThrough(g)
      await moveTo(join, g); await click(join, g)
      app().preview.robloxActivity(JAILBREAK, JOB)
      await sleep(2800, g)
      app().preview.robloxActivity(null)
    }
  },
  {
    chapter: 'Values', id: 'values', tab: 'Values', dur: 11500,
    async play(g) {
      const tile = await find(() => [...doc().querySelectorAll('button[aria-pressed]')].find((b) => b.textContent?.trim() === 'Vehicles'), g)
      await sleep(1600, g)
      await moveTo(tile, g); await click(tile as HTMLElement, g)
      await sleep(1400, g)
      await scrollThrough(g)
    }
  },
  {
    chapter: 'Calculator', id: 'calculator', tab: 'Value Calculator', dur: 19000,
    async play(g) {
      const search = await find('input[placeholder="Search items..."]', g) as HTMLInputElement
      await sleep(800, g)
      for (const [name, side] of [['Torpedo', 'Offer'], ['Beam Hybrid', 'Offer'], ['Javelin', 'Request']]) {
        await moveTo(search, g, -40, 0); await click(search, g)
        await type(search, name, g, 70)
        const card = (await find(() => doc().querySelector(`p[title="${name}"]`)?.closest('.flex-col'), g)) as HTMLElement
        const add = button(side, card) as HTMLElement
        await moveTo(add, g); await click(add, g)
        await sleep(500, g)
      }
      // Clear the search and browse, so the totals stick to the top while the list scrolls under them.
      const clear = await find('button[aria-label="Clear search"]', g)
      await moveTo(clear, g); await click(clear, g)
      await sleep(900, g)
      await scrollThrough(g)
      await sleep(800, g)
    }
  },
  {
    chapter: 'Dupe Finder', id: 'dupefinder', tab: 'Dupe Finder', dur: 13500,
    async play(g) {
      const box = await find('input[placeholder="Search Duplicates"]', g) as HTMLInputElement
      await sleep(1000, g)
      await moveTo(box, g, -40, 0); await click(box, g)
      await type(box, 'PeachPayload748', g, 70)
      const hit = await find(() => [...doc().querySelectorAll<HTMLElement>('li button')].find((b) => b.textContent?.includes('PeachPayload748')), g)
      await sleep(700, g)
      await moveTo(hit, g); await click(hit, g)
      await sleep(2200, g)
      await scrollThrough(g)
    }
  }
]

/* ---------- Copy under the preview (same text as the site's features list) ---------- */

const FEATURES: Record<string, { title: string; description: string; points: string[] }> = {
  Messages: {
    title: 'Agree on the trade, then meet in-game',
    description: 'Direct messages with unread counts, online status and replies.',
    points: [
      'Accepted trade offers appear in the chat, showing the items and values on each side.',
      'Send a game invite and the other person can join your server straight from the conversation. Detecting your Roblox session is Windows only.'
    ]
  },
  Trades: {
    title: 'Build a trade ad without leaving the list',
    description: 'Add items from the values list or your own inventory, and keep a running total for each side.',
    points: [
      'Shift-click an item to add it to Offering, or Ctrl-click to add it to Requesting.',
      'Mark each item as clean, duped or OG, or move it to the other side.',
      "Tag what you're after, such as adds, overpays, upgrades or OG owners, and add a note."
    ]
  },
  Robberies: {
    title: 'Find an open robbery and join in one click',
    description: 'A live grid of open robberies across Jailbreak servers, with a Bounties tab next to it.',
    points: [
      "Each card shows the criminal and cop count, who's already joined, the server's location, and a Join button. Casinos show their code when one is available, and Cargo Planes show a departure countdown.",
      "Filter by server size and country, sort by when a robbery was logged, and hide servers you've already joined.",
      "Turn on the bell next to any robbery in the sidebar to get an alert when it opens. Alerts keep working while you're on other tabs."
    ]
  },
  Values: {
    title: 'Clean and duped values side by side',
    description: 'Browse every item, with clean and duped values on every card.',
    points: [
      'Each value shows whether it went up or down, plus a demand rating, a trend, and when it was last updated.',
      'Narrow by type, from vehicles and HyperChromes to rims, horns, drifts and furniture, or by seasonal, limited and untradable items.',
      'Filter by demand from Close to None up to Very High, or by trend such as Rising, Hoarded, Manipulated or Hyped.'
    ]
  },
  Calculator: {
    title: "See who's winning the trade before you accept",
    description: 'Add items to Offering and Requesting and get the total for each side, plus how much more you are giving or getting.',
    points: [
      'Scan a screenshot of the in-game trade window to fill both sides automatically. Scanning runs on your computer; on a Mac it needs Apple silicon.',
      'Turn on Auto scan and the calculator follows the open trade while you are in a Jailbreak trading server, then clears when you close it. Auto scan is Windows only.',
      'Set each item as clean, duped or OG, change amounts, swap or mirror the sides, and browse the values list or your own inventory.'
    ]
  },
  'Dupe Finder': {
    title: "Check a player's dupes before you trade",
    description: 'Search a Roblox username to see how many duped items they have and what those items are worth in total.',
    points: [
      'See when each copy was logged and how many owners it has had.',
      'Search within their dupes, filter by type, and sort to show duplicates first.'
    ]
  }
}
const esc = (t: string): string => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const POINT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7"/></svg>'

const chapters = $('#chapters')
chapters.innerHTML = SCENES.map((s, i) =>
  `<button type="button" role="tab" data-ch="${i}"><span class="fill" aria-hidden="true"></span>${esc(s.chapter)}</button>`).join('')
const tabs = [...chapters.querySelectorAll<HTMLButtonElement>('button')]

function markChapter(i: number, ms: number): void {
  const f = FEATURES[SCENES[i].chapter], el = $('#feature')
  el.innerHTML = `<div><h3>${esc(f.title)}</h3><p style="--i:1">${esc(f.description)}</p></div>
    <ul>${f.points.map((p, j) => `<li style="--i:${j + 2}">${POINT_ICON}<span>${esc(p)}</span></li>`).join('')}</ul>`
  tabs.forEach((b, j) => {
    const on = j === i, fill = $('.fill', b)
    b.dataset.state = on ? 'active' : 'inactive'; b.setAttribute('aria-selected', String(on))
    fill.style.animation = 'none'
    if (on) { fill.getBoundingClientRect(); fill.style.animation = `app-preview-progress ${ms}ms linear forwards` }
  })
}

/* ---------- Run loop: every pass starts from a freshly loaded app ---------- */

const DEFAULT_THEME = (themes.find((t) => t.is_default) ?? themes[0])?.slug ?? 'dark'
let siteTheme = DEFAULT_THEME

// Loads a fresh app already on the given tab, hidden behind the visible one, and resolves once it has drawn.
async function loadApp(tab: string, g: number): Promise<HTMLIFrameElement> {
  const next = frame.cloneNode() as HTMLIFrameElement
  next.style.visibility = 'hidden'
  next.src = `app.html?theme=${siteTheme}&tab=${tab}`
  frame.after(next)
  try {
    for (let end = Date.now() + 8000; Date.now() < end && !next.contentDocument?.querySelector('button.bg-button-info'); ) await sleep(100, g)
    await sleep(500, g)
  } catch (e) {
    next.remove()
    throw e
  }
  return next
}

function show(next: HTMLIFrameElement): void {
  frame.remove()
  next.style.visibility = ''
  frame = next
}

async function run(from: number): Promise<void> {
  const g = ++gen
  hideTip()
  try {
    for (let i = from; ; i = (i + 1) % SCENES.length) {
      markChapter(i, reduced ? 2000 : SCENES[i].dur)
      if (i === from || i === 0) await goFreshTab(SCENES[i].tab, g, loadApp(SCENES[i].id, g))
      else await goTab(SCENES[i].tab, g)
      await SCENES[i].play(g)
    }
  } catch (e) {
    if (!(e instanceof Stop)) {
      console.error(e)
      // A missing target shouldn't freeze the preview; move on to the next chapter.
      if (g === gen) setTimeout(() => g === gen && run((from + 1) % SCENES.length), 1000)
    }
  }
}
tabs.forEach((b, i) => b.addEventListener('click', () => run(i)))

/* ---------- Site theme (tabs + backdrop, and the app itself) ----------
   Any theme the site's /v2/themes had when the preview was built (preview:snapshot saves them):
   1. ?theme=<slug> on the iframe URL
   2. parent.postMessage-style: iframe.contentWindow.postMessage({ type: 'jbcl-theme', theme: 'light' }, '*')
   3. same-origin embed: follows the theme's class on the parent page's <html> automatically */
const SLUGS = themes.map((t) => t.slug)

// The tabs and backdrop use the theme's own colors, as the site's matching tokens.
function paintTheme(slug: string): void {
  const vars = (themes.find((t) => t.slug === slug)?.vars ?? {}) as Record<string, string>
  const color = (key: string): string | undefined => {
    const value = vars[key]
    return vars[value?.match(/^var\((--[a-z0-9-]+)\)$/)?.[1] ?? ''] ?? value
  }
  const button = color('--color-button-info')
  const tokens: Record<string, string | undefined> = {
    '--stage': color('--color-primary-bg'),
    '--tab-bg': color('--color-secondary-bg'),
    '--tab-active': color('--color-tertiary-bg'),
    '--tab-hover': color('--color-quaternary-bg'),
    '--tab-text': color('--color-secondary-text'),
    '--tab-text-active': color('--color-primary-text'),
    '--tab-border': color('--color-border-card'),
    '--tab-fill': button && `color-mix(in srgb, ${button} 20%, transparent)`,
    '--tab-accent': color('--color-link')
  }
  const root = document.documentElement.style
  for (const [key, value] of Object.entries(tokens)) value ? root.setProperty(key, value) : root.removeProperty(key)
}

function setSiteTheme(theme: string | null): void {
  if (!theme || !SLUGS.includes(theme) || theme === siteTheme) return
  siteTheme = theme
  document.documentElement.dataset.siteTheme = theme
  paintTheme(theme)
  if (gen > 0) run(SCENES.findIndex((_, i) => tabs[i].dataset.state === 'active'))
}
paintTheme(siteTheme)
setSiteTheme(new URLSearchParams(location.search).get('theme'))
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'jbcl-theme') setSiteTheme(e.data.theme)
})
try {
  const parentRoot = window.parent !== window && window.parent.document.documentElement
  if (parentRoot) {
    const sync = (): void => setSiteTheme(SLUGS.find((t) => parentRoot.classList.contains(t)) ?? DEFAULT_THEME)
    sync()
    new MutationObserver(sync).observe(parentRoot, { attributes: true, attributeFilter: ['class'] })
  }
} catch { /* cross-origin parent: rely on ?theme= or postMessage */ }

/* Tell the embedding page our height so it can size the iframe with no inner scrollbar:
   window.addEventListener('message', (e) => { if (e.data?.type === 'jbcl-preview-height') iframe.style.height = e.data.height + 'px' }) */
if (window.parent !== window) {
  new ResizeObserver(() => window.parent.postMessage({ type: 'jbcl-preview-height', height: Math.ceil(document.body.getBoundingClientRect().height) }, '*'))
    .observe(document.body)
}

run(Math.min(SCENES.length - 1, Math.max(0, parseInt(location.hash.slice(1), 10) || 0)))
