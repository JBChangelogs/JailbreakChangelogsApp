import { app } from 'electron'
import { spawn } from 'child_process'
import { chmodSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { verifyMinisign } from './minisign'
import tauriConfig from '../../src-tauri/tauri.conf.json'

const MANIFEST_URL = 'https://updates.jailbreakchangelogs.com/tauri/latest.json'
const UPDATER_PUBLIC_KEY = tauriConfig.plugins.updater.pubkey
const MAX_ATTEMPTS = 3
const PLATFORM_KEYS: Record<string, string> = { 'win32-x64': 'windows-x86_64', 'linux-x64': 'linux-x86_64' }

export interface MigrationTarget {
  version: string
  url: string
  installer: string
  size: number
  notes?: string
}

interface Manifest {
  version: string
  notes?: string
  platforms: Record<string, { url: string; signature: string } | undefined>
}

interface BridgeState {
  attempts: number
  lastError?: string
}

const statePath = (): string => join(app.getPath('userData'), 'tauri-bridge.json')

function readState(): BridgeState {
  try {
    return { attempts: 0, ...JSON.parse(readFileSync(statePath(), 'utf8')) }
  } catch {
    return { attempts: 0 }
  }
}

function writeState(state: BridgeState): void {
  try {
    writeFileSync(statePath(), JSON.stringify(state))
  } catch (err) {
    console.error('[migration] failed to save state', err)
  }
}

function isNewerVersion(a: string, b: string): boolean {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0)
  }
  return false
}

export function isMigrationCapable(): boolean {
  if (!app.isPackaged || !PLATFORM_KEYS[`${process.platform}-${process.arch}`]) return false
  return process.platform !== 'linux' || Boolean(process.env.APPIMAGE)
}

export function migrationBlocked(): string | null {
  const { attempts, lastError } = readState()
  return attempts >= MAX_ATTEMPTS ? (lastError ?? 'install failed') : null
}

export interface FoundMigration {
  version: string
  url: string
  signature: string
  notes?: string
}

export async function findMigration(): Promise<FoundMigration | null> {
  if (!isMigrationCapable() || migrationBlocked()) return null
  const res = await fetch(MANIFEST_URL, { cache: 'no-store' })
  if (!res.ok) return null
  const manifest = (await res.json()) as Manifest
  const platform = manifest.platforms?.[PLATFORM_KEYS[`${process.platform}-${process.arch}`]]
  if (!platform?.url || !platform.signature || !isNewerVersion(manifest.version, app.getVersion())) return null
  if (!platform.url.startsWith('https://updates.jailbreakchangelogs.com/')) return null
  return {
    version: manifest.version.replace(/^v/, ''),
    url: platform.url,
    signature: platform.signature,
    notes: manifest.notes
  }
}

export async function downloadMigration(
  found: FoundMigration,
  onProgress: (transferred: number, total: number) => void
): Promise<MigrationTarget> {
  const res = await fetch(found.url)
  if (!res.ok || !res.body) throw new Error(`download failed (${res.status})`)
  const total = Number(res.headers.get('content-length')) || 0
  const chunks: Buffer[] = []
  let received = 0
  const reader = res.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(Buffer.from(value))
    received += value.length
    if (total) onProgress(received, total)
  }
  const file = Buffer.concat(chunks)
  if (!verifyMinisign(file, found.signature, UPDATER_PUBLIC_KEY)) throw new Error('signature verification failed')
  const installer = join(
    app.getPath('temp'),
    process.platform === 'win32' ? 'JBCLSetup-tauri.exe' : 'JBCLSetup-tauri.AppImage'
  )
  writeFileSync(installer, file)
  return { version: found.version, url: found.url, installer, size: file.length, notes: found.notes }
}

function recordFailure(error: string): void {
  const state = readState()
  writeState({ attempts: state.attempts + 1, lastError: error })
}

function runWindowsInstaller(installer: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(installer, ['/S'], { windowsHide: true })
    child.on('error', reject)
    child.on('exit', (code) => {
      const exe = join(process.env.LOCALAPPDATA ?? '', 'Jailbreak Changelogs', 'jailbreak-changelogs.exe')
      if (code === 0 && existsSync(exe)) resolve(exe)
      else reject(new Error(`installer exited with code ${code}`))
    })
  })
}

function replaceAppImage(installer: string): string {
  const target = process.env.APPIMAGE as string
  const staged = `${target}.new`
  writeFileSync(staged, readFileSync(installer))
  chmodSync(staged, 0o755)
  renameSync(staged, target)
  return target
}

export async function installMigration(target: MigrationTarget): Promise<boolean> {
  try {
    const exe =
      process.platform === 'win32' ? await runWindowsInstaller(target.installer) : replaceAppImage(target.installer)
    rmSync(target.installer, { force: true })
    spawn(exe, [], { detached: true, stdio: 'ignore' }).unref()
    writeState({ attempts: 0 })
    return true
  } catch (err) {
    console.error('[migration] install failed', err)
    recordFailure(err instanceof Error ? err.message : String(err))
    return false
  }
}
