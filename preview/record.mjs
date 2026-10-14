// Records one loop of the built preview tour (preview/dist) and saves it as dist/preview.gif for link embeds.
// Needs Chrome and ffmpeg (both preinstalled on GitHub's Ubuntu runners). CHROME_PATH overrides the browser.
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'

const dist = new URL('dist/', import.meta.url)
const WIDTH = 640 // GIF width; the app is recorded at 1280x800 and scaled down
const FPS = 10
const MAX_MS = 4 * 60 * 1000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' }

// The build uses absolute /assets paths, so serve dist/ at the root.
const server = createServer((req, res) => {
  try {
    const path = new URL(req.url, 'http://x').pathname
    const body = readFileSync(new URL('.' + (path === '/' ? '/index.html' : path), dist))
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body)
  } catch {
    res.writeHead(404).end()
  }
}).listen(0, '127.0.0.1')
await new Promise((r) => server.once('listening', r))
const site = `http://127.0.0.1:${server.address().port}`

const chromePath = process.env.CHROME_PATH ??
  (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'google-chrome')
const chrome = spawn(chromePath, [
  '--headless=new', '--hide-scrollbars', '--remote-debugging-port=0', '--no-first-run', '--no-sandbox',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'preview-chrome-'))}`,
  // 1280px of app plus the page's 16px side padding, tall enough to fit the stage.
  '--window-size=1312,1100', 'about:blank'
])
const wsUrl = await new Promise((resolve, reject) => {
  let log = ''
  chrome.stderr.on('data', (d) => {
    log += d
    const m = log.match(/DevTools listening on (ws:\S+)/)
    if (m) resolve(m[1])
  })
  chrome.once('exit', () => reject(new Error(`Chrome exited:\n${log}`)))
})

// Talk to the page over the DevTools protocol.
const browser = new WebSocket(wsUrl)
await new Promise((r) => (browser.onopen = r))
let nextId = 0
const pending = new Map()
const listeners = new Map()
browser.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  } else if (msg.method) listeners.get(msg.method)?.(msg.params)
}
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)))
    browser.send(JSON.stringify({ id, method, params, sessionId }))
  })
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const page = (method, params) => send(method, params, sessionId)
const evaluate = async (expression) => (await page('Runtime.evaluate', { expression, returnByValue: true })).result.value

await page('Page.enable')
await page('Emulation.setDeviceMetricsOverride', { width: 1312, height: 1100, deviceScaleFactor: 1, mobile: false })
await page('Page.navigate', { url: `${site}/index.html` })
await sleep(1500)

const box = await evaluate(`(() => { const r = document.querySelector('#win').getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } })()`)

// Chrome only sends a frame when the page changes, each with a timestamp; ffmpeg turns them into a steady frame
// rate. The progress bars change every frame, so keep at most twice the GIF's rate.
const frames = []
const dir = mkdtempSync(join(tmpdir(), 'preview-frames-'))
listeners.set('Page.screencastFrame', ({ data, metadata, sessionId: frameId }) => {
  void page('Page.screencastFrameAck', { sessionId: frameId })
  if (frames.length && metadata.timestamp - frames.at(-1).time < 1 / (FPS * 2)) return
  const file = join(dir, `${String(frames.length).padStart(5, '0')}.jpg`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  frames.push({ file, time: metadata.timestamp })
})
await page('Page.startScreencast', { format: 'jpeg', quality: 85 })

// Stop once the tour has been through every chapter and comes back to the first.
const activeChapter = `[...document.querySelectorAll('#chapters button')].findIndex((b) => b.dataset.state === 'active')`
const chapters = await evaluate(`document.querySelectorAll('#chapters button').length`)
const started = Date.now()
for (let seenLast = false; Date.now() - started < MAX_MS; await sleep(250)) {
  const active = await evaluate(activeChapter)
  if (active === chapters - 1) seenLast = true
  else if (seenLast && active === 0) break
}
await page('Page.stopScreencast')
console.log(`recorded ${frames.length} frames over ${((Date.now() - started) / 1000).toFixed(0)}s`)

browser.close()
chrome.kill()
server.close()

if (process.argv.includes('--frames-only')) {
  console.log(`frames in ${dir}`)
  process.exit(0)
}

// concat list: show each frame until the next one arrived.
const list = frames
  .map((f, i) => `file '${f.file.replace(/\\/g, '/')}'\nduration ${((frames[i + 1]?.time ?? f.time + 1 / FPS) - f.time).toFixed(3)}`)
  .join('\n')
writeFileSync(join(dir, 'list.txt'), `${list}\nfile '${frames.at(-1).file.replace(/\\/g, '/')}'\n`)

const out = new URL('preview.gif', dist)
const filters = [
  `crop=${box.w}:${box.h}:${box.x}:${box.y}`,
  `fps=${FPS}`,
  `scale=${WIDTH}:-1:flags=lanczos`,
  'split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle'
].join(',')
const ffmpeg = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'), '-vf', filters, '-loop', '0', out.pathname.replace(/^\/(\w:)/, '$1')], { stdio: 'inherit' })
rmSync(dir, { recursive: true, force: true })
if (ffmpeg.status !== 0) process.exit(ffmpeg.status ?? 1)
console.log(`preview.gif ${(statSync(out).size / 1e6).toFixed(1)}MB`)
