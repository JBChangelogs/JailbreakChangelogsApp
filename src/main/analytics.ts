import { app, type BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import { release } from 'os'
import { join } from 'path'
import { apiFetch } from './apiFetch'
import { loadToken } from './auth'

const ENDPOINT = 'https://api.jailbreakchangelogs.com/v2/analytics/events'
const FLUSH_INTERVAL_MS = 30_000
const MAX_BATCH = 100
// ponytail: drops the oldest events past this while offline; raise if long offline stretches matter
const MAX_QUEUE = 1000
const MAX_PROPS = 10

export type AnalyticsProps = Record<string, string | number | boolean>

interface AnalyticsEvent {
  name: string
  ts: number
  props: AnalyticsProps
}

interface AnalyticsState {
  installId: string
  enabled: boolean
  lastVersion?: string
}

const statePath = (): string => join(app.getPath('userData'), 'analytics.json')
const queuePath = (): string => join(app.getPath('userData'), 'analytics-queue.json')

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return fallback
  }
}

function writeJson(path: string, value: unknown): void {
  try {
    writeFileSync(path, JSON.stringify(value))
  } catch (err) {
    console.error('[analytics] failed to write', path, err)
  }
}

let state: AnalyticsState | null = null
let context: Record<string, string> = {}
let queue: AnalyticsEvent[] = []
let flushing = false
const startedAt = Date.now()

// Renderer input crosses a trust boundary: keep primitives only, at most MAX_PROPS keys.
function cleanProps(props: unknown): AnalyticsProps {
  if (!props || typeof props !== 'object') return {}
  const entries = Object.entries(props).filter(
    ([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
  )
  return Object.fromEntries(entries.slice(0, MAX_PROPS)) as AnalyticsProps
}

export function track(name: string, props?: unknown): void {
  if (!state?.enabled || typeof name !== 'string' || !name) return
  const event = { name, ts: Date.now(), props: cleanProps(props) }
  if (!app.isPackaged) {
    console.log('[analytics]', event.name, event.props)
    return
  }
  queue.push(event)
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE)
  writeJson(queuePath(), queue)
}

export async function flushAnalytics(): Promise<void> {
  if (flushing || !state?.enabled || !app.isPackaged) return
  flushing = true
  try {
    while (queue.length > 0) {
      const batch = queue.slice(0, MAX_BATCH)
      const token = loadToken()
      const res = await apiFetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
        body: JSON.stringify({ context, events: batch })
      })
      // 2xx: sent. 422: malformed, retrying won't help, so drop it. Anything else (429, 5xx): retry next flush.
      if (!res.ok && res.status !== 422) break
      queue = queue.slice(batch.length)
      writeJson(queuePath(), queue)
    }
  } catch {
    // Offline: events stay queued on disk.
  } finally {
    flushing = false
  }
}

export function isAnalyticsEnabled(): boolean {
  return state?.enabled ?? true
}

export function setAnalyticsEnabled(enabled: boolean): void {
  if (!state) return
  state.enabled = enabled
  writeJson(statePath(), state)
  if (!enabled) {
    queue = []
    writeJson(queuePath(), queue)
  }
}

export function trackAppClose(): void {
  track('app_close', { session_ms: Date.now() - startedAt })
}

// Call once after app ready.
export function initAnalytics(window: BrowserWindow): void {
  state = { installId: randomUUID(), enabled: true, ...readJson<Partial<AnalyticsState>>(statePath(), {}) }
  const previousVersion = state.lastVersion
  state.lastVersion = app.getVersion()
  writeJson(statePath(), state)

  queue = readJson<AnalyticsEvent[]>(queuePath(), [])
  context = {
    install_id: state.installId,
    app_version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    os_release: release(),
    locale: app.getLocale()
  }

  track('app_open', { cold_start: true })
  if (previousVersion && previousVersion !== state.lastVersion) {
    track('update_installed', { from: previousVersion, to: state.lastVersion })
  }

  void flushAnalytics()
  setInterval(() => void flushAnalytics(), FLUSH_INTERVAL_MS)
  window.on('blur', () => void flushAnalytics())
}
