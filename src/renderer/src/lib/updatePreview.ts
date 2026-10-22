import { APP_CHANGELOG, formatChangelogMarkdown } from '@shared/appChangelog'
import type { UpdaterStatus, UpdateSource } from '@shared/desktopApi'

type Listener = (status: UpdaterStatus) => void

const PREVIEW_SIZE = 17_173_033

const listeners = new Set<Listener>()
let timers: ReturnType<typeof setTimeout>[] = []

export function onUpdatePreview(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function endUpdatePreview(): void {
  timers.forEach(clearTimeout)
  timers = []
}

function nextVersion(): string {
  const [major = 0, minor = 0, patch = 0] = (APP_CHANGELOG[0]?.version ?? '0.0.0').split('.').map(Number)
  return `${major}.${minor}.${patch + 1}`
}

function play(steps: [number, UpdaterStatus][]): void {
  let at = 0
  for (const [delay, status] of steps) {
    at += delay
    timers.push(setTimeout(() => listeners.forEach((l) => l(status)), at))
  }
}

function downloadSteps(source: UpdateSource, version: string, notes?: string): [number, UpdaterStatus][] {
  const steps: [number, UpdaterStatus][] = [[300, { state: 'downloading', source, version, notes }]]
  for (let transferred = 0; transferred < PREVIEW_SIZE; transferred += 431_000) {
    const percent = Math.round((transferred / PREVIEW_SIZE) * 1000) / 10
    steps.push([120, { state: 'downloading', source, version, notes, percent, transferred, total: PREVIEW_SIZE }])
  }
  steps.push([
    120,
    { state: 'downloading', source, version, notes, percent: 100, transferred: PREVIEW_SIZE, total: PREVIEW_SIZE }
  ])
  steps.push([300, { state: 'downloaded', source, version, size: PREVIEW_SIZE, notes }])
  return steps
}

function previewNotes(): string | undefined {
  return APP_CHANGELOG[0] ? formatChangelogMarkdown(APP_CHANGELOG[0]) : undefined
}

export function runUpdatePreview(source: UpdateSource): void {
  endUpdatePreview()
  const version = nextVersion()
  const notes = previewNotes()
  const steps: [number, UpdaterStatus][] = [
    [0, { state: 'checking', source }],
    [700, { state: 'available', source, version, notes }]
  ]
  play(source === 'startup' ? [...steps, ...downloadSteps(source, version, notes)] : steps)
}

export function downloadUpdatePreview(): void {
  endUpdatePreview()
  play(downloadSteps('poll', nextVersion(), previewNotes()))
}
