import { app, BrowserWindow, desktopCapturer, screen, utilityProcess, type NativeImage, type UtilityProcess } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import detPath from '../../resources/ocr/det.onnx?asset&asarUnpack'
import recPath from '../../resources/ocr/rec.onnx?asset&asarUnpack'
import dictPath from '../../resources/ocr/dict.txt?asset&asarUnpack'
import {
  SCAN_TUNING,
  type AutoScanSettings,
  type ScanArea,
  type ScannerStatus,
  type ScanResponse
} from '../shared/tradeScan'
import type { WorkerRequest, WorkerResponse } from './ocrWorker'

function providersForPlatform(): string[] {
  if (process.platform === 'win32') return ['dml', 'cpu']
  if (process.platform === 'darwin') return ['coreml', 'cpu']
  // CUDA only loads if the user has CUDA 12 + cuDNN and the EP binaries; otherwise falls through to CPU.
  return ['cuda', 'cpu']
}

let worker: UtilityProcess | null = null
let ready: Promise<ScannerStatus> | null = null
let nextId = 0
const pending = new Map<number, (r: WorkerResponse) => void>()

export function getScannerStatus(): Promise<ScannerStatus> {
  if (ready) return ready
  if (process.platform === 'darwin' && process.arch === 'x64') {
    ready = Promise.resolve({ available: false, reason: 'Scanning needs a Mac with Apple silicon.' })
    return ready
  }

  ready = new Promise((resolve) => {
    const child = utilityProcess.fork(join(__dirname, 'ocrWorker.js'), [], { serviceName: 'Trade Scanner' })
    const fail = (reason: string): void => {
      worker = null
      resolve({ available: false, reason })
    }
    child.on('message', (message: WorkerResponse) => {
      if (message.type === 'ready') {
        worker = child
        resolve({ available: true, provider: message.provider })
      } else if (message.type === 'init-error') {
        console.error('[scanner] init failed:', message.message)
        child.kill()
        fail("The scanner couldn't start on this computer.")
      } else {
        pending.get(message.id)?.(message)
        pending.delete(message.id)
      }
    })
    child.on('exit', (code) => {
      for (const settle of pending.values()) settle({ type: 'scan-error', id: -1, message: 'Scanner stopped' })
      pending.clear()
      // Allow a fresh start on the next scan after a crash.
      if (worker === child) {
        worker = null
        ready = null
      } else fail(`The scanner stopped unexpectedly (code ${code}).`)
    })
    const init: WorkerRequest = { type: 'init', detPath, recPath, dictPath, providers: providersForPlatform() }
    child.postMessage(init)
  })
  return ready
}

async function runOcr(image: NativeImage): Promise<ScanResponse> {
  const { width, height } = image.getSize()
  // Snips can be small; only the upper bound matters here.
  if (width > SCAN_TUNING.maxWidth || height > SCAN_TUNING.maxHeight) {
    return { ok: false, code: 'image_too_large', message: 'That area is too large to scan.' }
  }
  const status = await getScannerStatus()
  if (!status.available || !worker) {
    return { ok: false, code: 'unavailable', message: status.available ? 'Scanner is not running.' : status.reason }
  }
  const id = nextId++
  const response = await new Promise<WorkerResponse>((resolve) => {
    pending.set(id, resolve)
    // toBitmap() is BGRA, which is the channel order the worker expects.
    const request: WorkerRequest = { type: 'scan', id, width, height, pixels: new Uint8Array(image.toBitmap()) }
    worker!.postMessage(request)
  })
  if (response.type === 'result') return { ok: true, width, height, detections: response.detections }
  console.error('[scanner] scan failed:', response.type === 'scan-error' ? response.message : response)
  return { ok: false, code: 'scan_failed', message: "Couldn't read that area. Please try again." }
}

async function captureArea(area: ScanArea): Promise<NativeImage | null> {
  const display = screen.getAllDisplays().find((d) => d.id === area.displayId)
  if (!display) return null
  const scale = display.scaleFactor
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.round(display.size.width * scale), height: Math.round(display.size.height * scale) }
  })
  const source = sources.find((s) => s.display_id === String(display.id)) ?? (sources.length === 1 ? sources[0] : null)
  if (!source || source.thumbnail.isEmpty()) return null
  return source.thumbnail.crop({
    x: Math.round(area.x * scale),
    y: Math.round(area.y * scale),
    width: Math.round(area.width * scale),
    height: Math.round(area.height * scale)
  })
}

// Snipping-tool overlay on the display under the cursor. Resolves with the drawn area (DIP, display-relative) or null.
const OVERLAY_HTML = `<!doctype html><html><head><style>
html,body{margin:0;height:100%;cursor:crosshair;user-select:none;overflow:hidden;font-family:system-ui,sans-serif}
#shade{position:fixed;inset:0;background:rgba(0,0,0,.35)}
#box{position:fixed;display:none;border:2px solid #4c9fff;box-shadow:0 0 0 9999px rgba(0,0,0,.35)}
#hint{position:fixed;top:24px;left:50%;transform:translateX(-50%);padding:8px 14px;border-radius:8px;background:rgba(18,19,23,.92);color:#fff;font-size:14px}
</style></head><body><div id="shade"></div><div id="box"></div>
<div id="hint">Drag a box around the trade window &middot; Esc to cancel</div><script>
window.__pick = new Promise(function (resolve) {
  var box = document.getElementById('box'), shade = document.getElementById('shade'), start = null;
  addEventListener('keydown', function (e) { if (e.key === 'Escape') resolve(null) });
  addEventListener('mousedown', function (e) { start = { x: e.clientX, y: e.clientY } });
  addEventListener('mousemove', function (e) {
    if (!start) return;
    shade.style.display = 'none'; box.style.display = 'block';
    box.style.left = Math.min(start.x, e.clientX) + 'px'; box.style.top = Math.min(start.y, e.clientY) + 'px';
    box.style.width = Math.abs(e.clientX - start.x) + 'px'; box.style.height = Math.abs(e.clientY - start.y) + 'px';
  });
  addEventListener('mouseup', function (e) {
    if (!start) return;
    var r = { x: Math.min(start.x, e.clientX), y: Math.min(start.y, e.clientY), width: Math.abs(e.clientX - start.x), height: Math.abs(e.clientY - start.y) };
    resolve(r.width < 20 || r.height < 20 ? null : r);
  });
});
</script></body></html>`

let picking = false

export async function pickArea(): Promise<ScanArea | null> {
  if (picking) return null
  picking = true
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const overlay = new BrowserWindow({
    ...display.bounds,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    show: false,
    webPreferences: { sandbox: true }
  })
  try {
    overlay.setAlwaysOnTop(true, 'screen-saver')
    await overlay.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(OVERLAY_HTML))
    overlay.show()
    overlay.focus()
    const closed = new Promise<null>((resolve) => overlay.once('closed', () => resolve(null)))
    const rect = (await Promise.race([overlay.webContents.executeJavaScript('window.__pick'), closed])) as Omit<
      ScanArea,
      'displayId'
    > | null
    return rect ? { displayId: display.id, ...rect } : null
  } finally {
    picking = false
    if (!overlay.isDestroyed()) overlay.destroy()
  }
}

const delay = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

// Minimise the app while picking (and capturing), so the game underneath can be selected.
async function withAppHidden<T>(fn: () => Promise<T>): Promise<T> {
  const owner = BrowserWindow.getFocusedWindow()
  if (owner) {
    owner.minimize()
    await delay(250)
  }
  try {
    return await fn()
  } finally {
    owner?.restore()
  }
}

export async function snipAndScan(): Promise<ScanResponse | null> {
  const captured = await withAppHidden(async () => {
    const area = await pickArea()
    if (!area) return null
    // Give the overlay a moment to disappear before capturing.
    await delay(150)
    return { image: await captureArea(area) }
  })
  if (!captured) return null
  if (!captured.image) return { ok: false, code: 'capture_failed', message: "Couldn't capture the screen." }
  return runOcr(captured.image)
}

// Auto scan: while on Jailbreak's trading server, scan the saved area every few seconds.
const TRADING_PLACE_ID = '9780994092'
// Pause between scans. Capture is ~50ms and OCR ~150-250ms, but OCR is skipped when the area hasn't changed.
const AUTO_SCAN_INTERVAL_MS = 150
// Mean per-pixel difference (0-255) on the fingerprint that counts as a change.
const AUTO_SCAN_CHANGE_THRESHOLD = 2

const settingsPath = (): string => join(app.getPath('userData'), 'scanner.json')
let autoSettings: AutoScanSettings | null = null
let placeId: string | null = null
let autoTimer: ReturnType<typeof setTimeout> | null = null
let autoRunning = false
let onAutoResult: ((result: ScanResponse) => void) | null = null

export function getAutoScanSettings(): AutoScanSettings {
  if (!autoSettings) {
    try {
      autoSettings = { enabled: false, area: null, ...JSON.parse(readFileSync(settingsPath(), 'utf8')) }
    } catch {
      autoSettings = { enabled: false, area: null }
    }
  }
  return autoSettings as AutoScanSettings
}

function saveAutoScanSettings(next: AutoScanSettings): AutoScanSettings {
  autoSettings = next
  try {
    writeFileSync(settingsPath(), JSON.stringify(next))
  } catch (err) {
    console.error('[scanner] failed to save settings', err)
  }
  updateAutoScan()
  return next
}

export function setAutoScanEnabled(enabled: boolean): AutoScanSettings {
  return saveAutoScanSettings({ ...getAutoScanSettings(), enabled: Boolean(enabled) })
}

export async function pickAutoScanArea(): Promise<AutoScanSettings> {
  const area = await withAppHidden(pickArea)
  return area ? saveAutoScanSettings({ ...getAutoScanSettings(), area }) : getAutoScanSettings()
}

// Cheap change detection: a tiny greyscale thumbnail of the capture. OCR only runs when it changes.
function fingerprint(image: NativeImage): Uint8Array {
  const bgra = image.resize({ width: 96, quality: 'good' }).toBitmap()
  const grey = new Uint8Array(bgra.length / 4)
  for (let i = 0; i < grey.length; i++) grey[i] = (bgra[i * 4] + bgra[i * 4 + 1] + bgra[i * 4 + 2]) / 3
  return grey
}

function sameFrame(a: Uint8Array | null, b: Uint8Array): boolean {
  if (!a || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i])
  return diff / a.length < AUTO_SCAN_CHANGE_THRESHOLD
}

let lastFingerprint: Uint8Array | null = null
let lastResult: ScanResponse | null = null

async function autoScanTick(): Promise<void> {
  const area = getAutoScanSettings().area
  if (!area) return
  const image = await captureArea(area)
  if (!image) return
  const print = fingerprint(image)
  // Unchanged screen: resend the last result so the renderer still sees time pass (for "left the trade menu").
  if (sameFrame(lastFingerprint, print) && lastResult) {
    onAutoResult?.(lastResult)
    return
  }
  const result = await runOcr(image)
  lastFingerprint = print
  lastResult = result
  onAutoResult?.(result)
}

function updateAutoScan(): void {
  const { enabled, area } = getAutoScanSettings()
  const shouldRun = enabled && area !== null && placeId === TRADING_PLACE_ID
  if (shouldRun && !autoRunning) {
    autoRunning = true
    lastFingerprint = null
    lastResult = null
    // Back-to-back loop: the next scan starts a short pause after the previous one finishes.
    const loop = async (): Promise<void> => {
      if (!autoRunning) return
      try {
        await autoScanTick()
      } catch (err) {
        console.error('[scanner] auto scan failed', err)
      }
      if (autoRunning) autoTimer = setTimeout(() => void loop(), AUTO_SCAN_INTERVAL_MS)
    }
    void loop()
  } else if (!shouldRun && autoRunning) {
    autoRunning = false
    if (autoTimer) clearTimeout(autoTimer)
    autoTimer = null
  }
}

export function initAutoScan(onResult: (result: ScanResponse) => void): void {
  onAutoResult = onResult
  updateAutoScan()
}

export function setRobloxPlace(next: string | null): void {
  placeId = next
  updateAutoScan()
}
