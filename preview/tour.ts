// Drives the real app in the iframe: moves a fake cursor, clicks, types and scrolls through each feature.
// Targets are found by label, placeholder or text, so the tour follows the app as long as those stay put.
import type { preview as Controls } from './app/mock'
import themes from './app/themes.json'
import tradeShot from './trade-scan.webp'

// The example group chat in app/mock.ts. Not imported from there: that module installs the mocks.
const GROUP_NAME = 'Trade crew'

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
let crosshair: HTMLElement | undefined
function placeCursor(x: number, y: number): void {
  cx = Math.round(x); cy = Math.round(y)
  cursor.style.transform = `translate(${cx}px, ${cy}px)`
  if (crosshair) crosshair.style.transform = `translate(${cx}px, ${cy}px)`
}
placeCursor(cx, cy)

/* ---------- Helpers (all coordinates are the app's own 1280x800 viewport) ---------- */

let gen = 0
class Stop extends Error {}
const sleep = (ms: number, g: number): Promise<void> =>
  new Promise((res, rej) => setTimeout(() => (g === gen ? res() : rej(new Stop())), reduced ? Math.min(ms, 400) : ms))
const doc = (): Document => frame.contentDocument as Document
const app = (): Window & { preview: typeof Controls } => frame.contentWindow as Window & { preview: typeof Controls }

// Every opened tab stays mounted, hidden behind aria-hidden, so lookups skip the tabs that aren't showing.
const shown = (el: Element): boolean => !el.closest('[aria-hidden="true"]')

async function find(what: string | (() => Element | null | undefined), g: number, timeout = 8000): Promise<HTMLElement> {
  const lookup = typeof what === 'string' ? () => [...doc().querySelectorAll(what)].find(shown) : what
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
  // Matches the cursor's .7s glide, so the click lands as it arrives.
  await sleep(700, g)
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
  await sleep(60, g)
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
// Native smooth scrolling covers any distance in about the same time, which races through long lists,
// so scroll at a steady reading speed instead, and only so far.
const SCROLL_SPEED = 350
const MAX_SCROLL = 1200
async function scrollTo(el: HTMLElement | undefined, top: number | 'end', g: number): Promise<void> {
  if (!el) return
  const from = el.scrollTop
  const target = top === 'end' ? Math.min(el.scrollHeight - el.clientHeight, from + MAX_SCROLL) : top
  if (reduced) {
    el.scrollTop = target
    await sleep(400, g)
    return
  }
  const distance = target - from
  const duration = Math.max(600, (Math.abs(distance) / SCROLL_SPEED) * 1000)
  const start = performance.now()
  await new Promise<void>((resolve) => {
    const step = (now: number): void => {
      if (g !== gen) return resolve()
      const t = Math.min(1, (now - start) / duration)
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      el.scrollTop = from + distance * eased
      if (t < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
  await sleep(300, g)
}
async function scrollThrough(g: number): Promise<void> {
  const sc = mainScroller()
  if (!sc) return
  await moveTo(sc, g, 120, 60)
  await scrollTo(sc, 'end', g); await sleep(1200, g)
  await scrollTo(sc, 0, g)
}
const tabSelector = (id: string): string => `[role="tab"][data-tab-type="${id}"]`

// Tabs switch on pointerdown, so a plain click() wouldn't select one.
async function pressTab(el: HTMLElement, g: number): Promise<void> {
  ripple()
  await sleep(60, g)
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }))
  el.ownerDocument.defaultView?.dispatchEvent(new PointerEvent('pointerup', { button: 0, pointerId: 1 }))
}

async function goTab(id: string, label: string, g: number): Promise<void> {
  const open = doc().querySelector<HTMLElement>(tabSelector(id))
  if (open) {
    if (open.getAttribute('aria-selected') === 'true') return
    await moveTo(open, g)
    showTip(open, label)
    await pressTab(open, g); hideTip()
    return
  }
  const plus = await find('button[aria-label="New tab"]', g)
  await moveTo(plus, g)
  showTip(plus, 'New tab')
  await click(plus, g); hideTip()
  // Radix places the menu off-screen for its first frame while it measures, so wait until it's really there.
  const item = await find(() => {
    const found = [...doc().querySelectorAll<HTMLElement>('[data-radix-popper-content-wrapper] button')].find((b) =>
      b.textContent?.trim().startsWith(label)
    )
    const r = found?.getBoundingClientRect()
    return r && r.top > 0 && r.left > 0 && r.bottom < 800 && r.right < 1280 ? found : null
  }, g)
  await sleep(180, g)
  await moveTo(item, g)
  await click(item, g)
  await find(tabSelector(id), g)
}

// With a fresh app loading in the background, the cursor goes to the tab in the visible app and clicks
// only once the fresh one is ready, swapping it in on the click, so the old state never shows afterwards.
// Closes every tab but Messages with its x, the way someone tidies up before starting over.
async function closeTabs(g: number): Promise<void> {
  const open = (): HTMLElement[] =>
    [...doc().querySelectorAll<HTMLElement>('[role="tab"][data-tab-type]')].filter((t) => t.dataset.tabType !== 'messages')
  for (let left = open(); left.length; left = open()) {
    const x = left[left.length - 1].querySelector<HTMLElement>('button[aria-label^="Close"]')
    if (!x) return
    await moveTo(x, g, 0, 0)
    await click(x, g)
    await sleep(350, g)
  }
}

async function goFreshTab(id: string, label: string, g: number, fresh: Promise<HTMLIFrameElement>): Promise<void> {
  fresh.catch(() => {})
  const btn = doc().querySelector<HTMLElement>(tabSelector(id))
  if (btn) {
    await moveTo(btn, g)
    showTip(btn, label)
  }
  const next = await fresh
  if (btn) { ripple(); await sleep(140, g) }
  hideTip()
  show(next)
}

/* ---------- Trade scan ---------- */

// Scanning hides the app and puts the scanner's picker (src/renderer/picker.html) over the game, so the tour does
// the same: the screenshot fills the window like the screen behind the app, under a copy of that picker.
// preview/trade-scan.webp is 1920x1035, scaled by 800/1035 to fill the window and cropped ~102px each side;
// SNIP_BOX is its trade window in window coordinates.
const SNIP_BOX = { left: 267, top: 220, width: 745, height: 460 }
const DRAG_GLIDE = 1400
// Loaded up front so it shows the moment the scan starts.
const shotImage = new Image()
shotImage.src = tradeShot
const shotReady = shotImage.decode().catch(() => {})

crosshair = document.createElement('div')
crosshair.className = 'crosshair'
cursor.after(crosshair)

async function playSnip(g: number): Promise<void> {
  await shotReady
  const screen = document.createElement('div')
  screen.className = 'snip'
  screen.innerHTML =
    `<img src="${tradeShot}" alt=""><div class="pick-shade"></div><div class="pick-box"></div>` +
    '<div class="pick-hint">Drag a box around the trade window &middot; Esc to cancel</div>'
  win.append(screen)
  const shade = screen.querySelector<HTMLElement>('.pick-shade')!
  const box = screen.querySelector<HTMLElement>('.pick-box')!
  box.style.left = SNIP_BOX.left + 'px'; box.style.top = SNIP_BOX.top + 'px'
  cursor.style.visibility = 'hidden'
  crosshair!.style.display = 'block'
  try {
    // Time to read the picker's hint before the drag.
    await sleep(1300, g)
    placeCursor(SNIP_BOX.left, SNIP_BOX.top)
    await sleep(1000, g)
    // Like the picker, the shade stays until the mouse moves, then the box is drawn as it drags. The drag glides
    // slower than other moves, and the box eases with the crosshair so its corner stays under it.
    document.documentElement.style.setProperty('--glide', DRAG_GLIDE + 'ms')
    shade.style.display = 'none'
    box.style.display = 'block'
    box.getBoundingClientRect()
    box.style.width = SNIP_BOX.width + 'px'; box.style.height = SNIP_BOX.height + 'px'
    placeCursor(SNIP_BOX.left + SNIP_BOX.width, SNIP_BOX.top + SNIP_BOX.height)
    await sleep(DRAG_GLIDE + 600, g)
  } finally {
    document.documentElement.style.removeProperty('--glide')
    screen.remove()
    crosshair!.style.display = 'none'
    cursor.style.visibility = ''
  }
}

// While auto scan runs, a corner view of the game with the scanned area outlined.
function showGame(): () => void {
  const pip = document.createElement('div')
  pip.className = 'snip-pip'
  pip.innerHTML = `<img src="${tradeShot}" alt=""><div class="snip-pip-area"></div><span>Watching the trade</span>`
  win.append(pip)
  requestAnimationFrame(() => pip.classList.add('on'))
  return () => {
    pip.classList.remove('on')
    setTimeout(() => pip.remove(), 300)
  }
}

/* ---------- Scenes ---------- */

const JAILBREAK = '606849621'
const JOB = 'b6f2c1e0-3f5a-4c1e-9a77-2d8e5c4f1a90'

const TRADE_USER = 'reysar123'

const SCENES: { chapter: string; id: string; tab: string; dur: number; play: (g: number) => Promise<void> }[] = [
  {
    chapter: 'Messages', id: 'messages', tab: 'Messages', dur: 26000,
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
      // Group chats sit in the same list. Opening one shows its member list beside the chat.
      const groupRow = await find(
        () => [...doc().querySelectorAll<HTMLElement>('[role="button"]')].find((row) => row.textContent?.includes(GROUP_NAME)),
        g
      )
      await moveTo(groupRow, g); await click(groupRow, g)
      await sleep(1800, g)
      preview.groupTyping(preview.smyke); preview.groupTyping(preview.flik)
      await sleep(2200, g)
      preview.groupReceive(preview.smyke, 'trade crew stays winning')
      await sleep(2600, g)
    }
  },
  {
    chapter: 'Trades', id: 'trades', tab: 'Trades', dur: 14000,
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
    chapter: 'Robberies', id: 'tracker', tab: 'Robbery & Bounty Tracker', dur: 15000,
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
    chapter: 'Values', id: 'values', tab: 'Values', dur: 15500,
    async play(g) {
      const tile = await find(() => [...doc().querySelectorAll('button[aria-pressed]')].find((b) => b.textContent?.trim() === 'Vehicles'), g)
      await sleep(1600, g)
      await moveTo(tile, g); await click(tile as HTMLElement, g)
      await sleep(1400, g)
      await scrollThrough(g)
    }
  },
  {
    chapter: 'Calculator', id: 'calculator', tab: 'Value Calculator', dur: 34000,
    async play(g) {
      const scan = await find(() => [...doc().querySelectorAll<HTMLElement>('button')].find((b) => shown(b) && b.textContent?.trim() === 'Scan trade'), g)
      await sleep(1200, g)
      await moveTo(scan, g)
      showTip(scan, 'Scan the trade in Jailbreak'); await sleep(1100, g)
      await click(scan, g); hideTip()
      await playSnip(g)
      app().preview.finishSnip()
      await sleep(700, g)
      showTip(scan, 'Both sides fill in from the scan'); await sleep(3400, g); hideTip()
      const auto = await find(
        () => [...doc().querySelectorAll<HTMLElement>('label')].find((l) => shown(l) && l.textContent?.includes('Auto scan'))?.querySelector<HTMLElement>('[role="switch"]'),
        g
      )
      await moveTo(auto, g)
      showTip(auto, 'Or let Auto scan follow the trade'); await sleep(1500, g)
      await click(auto, g); hideTip()
      // A clicked control keeps focus, which holds its tooltip open.
      ;(doc().activeElement as HTMLElement | null)?.blur()
      await sleep(400, g)
      await playSnip(g)
      app().preview.finishPick()
      const hideGame = showGame()
      try {
        await sleep(900, g)
        showTip(auto, 'Keeps the calculator in sync while you trade')
        for (let i = 0; i < 4; i++) {
          app().preview.autoScan(6)
          await sleep(1200, g)
        }
        hideTip()
      } finally {
        hideGame()
      }
      await sleep(1200, g)
    }
  },
  {
    chapter: 'Dupe Finder', id: 'dupefinder', tab: 'Dupe Finder', dur: 17500,
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
  },
  {
    chapter: 'Trade History', id: 'tradehistory', tab: 'Trade History', dur: 16000,
    async play(g) {
      const box = await find('input[placeholder="Username or ID"]', g) as HTMLInputElement
      await sleep(900, g)
      await moveTo(box, g, -40, 0); await click(box, g)
      await type(box, TRADE_USER, g, 70)
      box.form?.requestSubmit()
      const busiest = await find(() => {
        const cells = [...doc().querySelectorAll<HTMLElement>('section button[aria-label*=" on "]')]
        const count = (b: HTMLElement): number => parseInt(b.getAttribute('aria-label') ?? '', 10) || 0
        return cells.length && cells.some((c) => count(c) > 0) ? cells.reduce((a, b) => (count(b) > count(a) ? b : a)) : null
      }, g)
      await sleep(1600, g)
      await moveTo(busiest, g); await sleep(900, g)
      await click(busiest, g)
      const first = await find(() => doc().querySelector<HTMLElement>('article button'), g)
      await sleep(1400, g)
      await moveTo(first, g); await click(first, g)
      await sleep(2600, g)
    }
  }
]

/* ---------- Copy under the preview (same text as the site's features list) ---------- */

const FEATURES: Record<string, { title: string; description: string; points: string[] }> = {
  Messages: {
    title: 'Agree on the trade, then meet in-game',
    description: 'Direct messages and group chats with unread counts, online status and replies.',
    points: [
      'Group chats of up to 10 people sit right alongside your DMs, with a member list showing who is online.',
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
  },
  'Trade History': {
    title: 'See who someone has really traded with',
    description: "Look up any Roblox account's recorded trades, with a chart of how many they made each day.",
    points: [
      'Click a day on the chart to see just the trades from that day.',
      'Open a trade to see what each side gave, with clean, duped and OG items and their values.',
      'Totals for trades, pending trades and trade partners sit in the sidebar.'
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
    for (let end = Date.now() + 8000; Date.now() < end && !next.contentDocument?.querySelector('[role="tab"][aria-selected="true"]'); ) await sleep(100, g)
    await sleep(500, g)
  } catch (e) {
    next.remove()
    throw e
  }
  // The site's theme may have changed while it loaded.
  setAppTheme(next)
  return next
}

function show(next: HTMLIFrameElement): void {
  $('#splash')?.remove()
  frame.remove()
  next.style.visibility = ''
  frame = next
}

// fresh: start from a newly loaded app (first start, and after an error). Picking a chapter instead carries on in
// the open app, opening that chapter's tab from the + menu like any other step.
async function run(from: number, fresh: boolean): Promise<void> {
  const g = ++gen
  hideTip()
  if (!fresh) {
    // A scan or area pick the interrupted chapter left waiting would keep the app's button busy.
    app().preview?.finishSnip()
    app().preview?.finishPick()
  }
  try {
    for (let i = from, first = true; ; i = (i + 1) % SCENES.length, first = false) {
      markChapter(i, reduced ? 2000 : SCENES[i].dur)
      if (first ? fresh : i === 0) {
        if (!first) await closeTabs(g)
        await goFreshTab(SCENES[i].id, SCENES[i].tab, g, loadApp(SCENES[i].id, g))
      } else {
        await goTab(SCENES[i].id, SCENES[i].tab, g)
      }
      await SCENES[i].play(g)
    }
  } catch (e) {
    if (!(e instanceof Stop)) {
      console.error(e)
      // A missing target shouldn't freeze the preview; move on to the next chapter.
      if (g === gen) setTimeout(() => g === gen && run((from + 1) % SCENES.length, true), 1000)
    }
  }
}
tabs.forEach((b, i) => b.addEventListener('click', () => run(i, false)))

/* ---------- Site theme (tabs + backdrop, and the app itself) ----------
   Any theme the site's /v2/themes had when the preview was built (preview:snapshot saves them):
   1. ?theme=<slug> on the iframe URL
   2. parent.postMessage-style: iframe.contentWindow.postMessage({ type: 'jbcl-theme', theme: 'light' }, '*')
   3. same-origin embed: follows the theme's class on the parent page's <html> automatically

   A website custom theme draws over the site theme, the same three ways:
   1. ?customTheme=<share code>, looked up live (rate-limited by the API, so prefer 2 or 3)
   2. postMessage({ type: 'jbcl-theme', theme, customTheme: { share_code, label, scheme, vars, logo_filter } | null })
   3. same-origin embed: follows the parent's data-custom-theme and reads the theme from its localStorage */
const SLUGS = themes.map((t) => t.slug)

interface CustomTheme {
  share_code: string
  vars: Record<string, string>
  [key: string]: unknown
}
const isCustomTheme = (value: unknown): value is CustomTheme => {
  const t = value as CustomTheme | null
  return !!t && typeof t.share_code === 'string' && /^[A-Z0-9]{8}$/i.test(t.share_code) && !!t.vars && typeof t.vars === 'object'
}
// The custom theme in use, or null. Freshly loaded apps read it from here (app/mock.ts).
let customTheme: CustomTheme | null = null
Object.assign(window, { jbclCustomTheme: null })

// The tabs and backdrop use the theme's own colors, as the site's matching tokens.
function paintTheme(slug: string): void {
  const vars = {
    ...(themes.find((t) => t.slug === slug)?.vars ?? {}),
    ...(customTheme?.vars ?? {})
  } as Record<string, string>
  const color = (key: string): string | undefined => {
    const value = vars[key]
    return vars[value?.match(/^var\((--[a-z0-9-]+)\)$/)?.[1] ?? ''] ?? value
  }
  const button = color('--color-button-info')
  const tokens: Record<string, string | undefined> = {
    '--stage': color('--color-primary-bg'),
    // The app window and its loading screen
    '--primary-bg': color('--color-primary-bg'),
    '--primary-text': color('--color-primary-text'),
    '--border-primary': color('--color-border-primary'),
    '--status-info': color('--color-status-info'),
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
  setAppTheme(frame)
}
function setCustomTheme(next: unknown): void {
  const theme = isCustomTheme(next) ? next : null
  if (JSON.stringify(theme) === JSON.stringify(customTheme)) return
  customTheme = theme
  Object.assign(window, { jbclCustomTheme: theme })
  if (theme) document.documentElement.dataset.customTheme = theme.share_code
  else delete document.documentElement.dataset.customTheme
  paintTheme(siteTheme)
  setAppTheme(frame)
}
// Switches the running app in place, so the tour carries on without reloading it.
function setAppTheme(f: HTMLIFrameElement): void {
  const controls = (f.contentWindow as (Window & { preview?: typeof Controls }) | null)?.preview
  controls?.theme(siteTheme)
  controls?.customTheme(customTheme)
}
paintTheme(siteTheme)
const query = new URLSearchParams(location.search)
setSiteTheme(query.get('theme'))
const sharedCode = query.get('customTheme')?.toUpperCase()
if (sharedCode && /^[A-Z0-9]{8}$/.test(sharedCode)) {
  fetch(`https://api.jailbreakchangelogs.com/v2/themes/shared/${sharedCode}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((theme) => theme && !customTheme && setCustomTheme(theme))
    .catch(() => { /* no custom theme then */ })
}
window.addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'jbcl-theme') return
  setSiteTheme(e.data.theme)
  if ('customTheme' in e.data) setCustomTheme(e.data.customTheme)
})
try {
  const parentWindow = window.parent !== window ? window.parent : null
  const parentRoot = parentWindow?.document.documentElement
  if (parentWindow && parentRoot) {
    const sync = (): void => {
      setSiteTheme(SLUGS.find((t) => parentRoot.classList.contains(t)) ?? DEFAULT_THEME)
      // The website keeps the whole custom theme in localStorage and marks <html> with its code.
      let saved: unknown = null
      try {
        saved = parentRoot.dataset.customTheme ? JSON.parse(parentWindow.localStorage.getItem('custom_theme') ?? 'null') : null
      } catch { /* unreadable: treat as none */ }
      setCustomTheme(saved)
    }
    sync()
    new MutationObserver(sync).observe(parentRoot, { attributes: true, attributeFilter: ['class', 'data-custom-theme'] })
  }
} catch { /* cross-origin parent: rely on ?theme= / ?customTheme= or postMessage */ }

/* Tell the embedding page our height so it can size the iframe with no inner scrollbar:
   window.addEventListener('message', (e) => { if (e.data?.type === 'jbcl-preview-height') iframe.style.height = e.data.height + 'px' }) */
if (window.parent !== window) {
  new ResizeObserver(() => window.parent.postMessage({ type: 'jbcl-preview-height', height: Math.ceil(document.body.getBoundingClientRect().height) }, '*'))
    .observe(document.body)
}

run(Math.min(SCENES.length - 1, Math.max(0, parseInt(location.hash.slice(1), 10) || 0)), true)
