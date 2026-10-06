import { exec } from 'child_process'
import { promisify } from 'util'
import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { KNOWN_ROBLOX_GAMES } from '../shared/robloxGames'

const execAsync = promisify(exec)

const TARGET_PROCESS = 'RobloxPlayerBeta.exe'
const JOB_ID_PATTERN = /Joining game '([0-9a-fA-F-]{36})' place (\d+)/g
const LOG_CREATE_BUFFER_MS = 5_000
const POLL_INTERVAL_MS = 2_000
const LAUNCH_TIME_FALLBACK_WINDOW_MS = 12 * 60 * 60 * 1000
const STALE_SESSION_MS = 10_000
export interface RobloxActivityEvent {
  jobId: string | null
  placeId: string | null
  game: string | null
}

async function isRobloxRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${TARGET_PROCESS}" /FO CSV /NH`)
    return stdout.toLowerCase().includes(TARGET_PROCESS.toLowerCase())
  } catch {
    return false
  }
}

async function getRobloxLaunchTime(): Promise<number | null> {
  try {
    const { stdout } = await execAsync(
      `powershell -NoProfile -Command "(Get-Process -Name RobloxPlayerBeta -ErrorAction SilentlyContinue | Sort-Object StartTime | Select-Object -First 1 -ExpandProperty StartTime).ToUniversalTime().ToString('o')"`
    )
    const trimmed = stdout.trim()
    if (!trimmed) {
      console.warn('[roblox-watcher] Get-Process returned no StartTime for RobloxPlayerBeta')
      return null
    }
    const parsed = Date.parse(trimmed)
    if (Number.isNaN(parsed)) {
      console.warn('[roblox-watcher] could not parse Roblox launch time from:', trimmed)
      return null
    }
    return parsed
  } catch (error) {
    console.warn('[roblox-watcher] failed to query Roblox launch time:', error)
    return null
  }
}

async function readText(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf-8')
  } catch {
    return ''
  }
}

async function getRecentLogFiles(logDir: string, notBefore: number): Promise<string[]> {
  let names: string[]
  try {
    names = await readdir(logDir)
  } catch {
    return []
  }

  const candidates = names.filter((name) => name.endsWith('.log')).map((name) => join(logDir, name))
  const withMtimes = await Promise.all(
    candidates.map(async (path) => {
      try {
        const stats = await stat(path)
        return { path, mtime: stats.mtimeMs }
      } catch {
        return null
      }
    })
  )

  return withMtimes
    .filter((entry): entry is { path: string; mtime: number } => entry !== null && entry.mtime >= notBefore)
    .sort((a, b) => a.mtime - b.mtime)
    .map((entry) => entry.path)
}

function findLastMatch(content: string): { jobId: string; placeId: string } | null {
  JOB_ID_PATTERN.lastIndex = 0
  let last: RegExpExecArray | null = null
  let match: RegExpExecArray | null
  while ((match = JOB_ID_PATTERN.exec(content))) last = match
  return last ? { jobId: last[1], placeId: last[2] } : null
}

export function startRobloxGameWatcher(onActivity: (event: RobloxActivityEvent) => void): () => void {
  if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) return () => { }

  const logDir = join(process.env.LOCALAPPDATA, 'Roblox', 'logs')

  let cancelled = false
  let wasRunning = false
  let sessionStart = 0
  let initializing = false
  let inGame = false
  let lastLogGrowthAt = 0
  const REQUIRED_CONSECUTIVE_POLLS = 2
  let presentStreak = 0
  let missingStreak = 0
  const fileBaselines = new Map<string, number>()
  const seenJobIds = new Set<string>()

  const report = (jobId: string, placeId: string): void => {
    if (seenJobIds.has(jobId)) return
    seenJobIds.add(jobId)
    inGame = true
    lastLogGrowthAt = Date.now()
    onActivity({ jobId, placeId, game: KNOWN_ROBLOX_GAMES[placeId] ?? null })
  }

  const clearActivity = (): void => {
    if (!inGame) return
    inGame = false
    onActivity({ jobId: null, placeId: null, game: null })
  }

  const scanFile = (content: string, baseline: number): void => {
    JOB_ID_PATTERN.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = JOB_ID_PATTERN.exec(content))) {
      if (match.index + match[0].length <= baseline) continue
      report(match[1], match[2])
    }
  }

  const poll = async (): Promise<void> => {
    if (cancelled) return

    const runningNow = await isRobloxRunning()
    if (runningNow) {
      presentStreak += 1
      missingStreak = 0
    } else {
      missingStreak += 1
      presentStreak = 0
    }
    const running = wasRunning
      ? missingStreak < REQUIRED_CONSECUTIVE_POLLS
      : presentStreak >= REQUIRED_CONSECUTIVE_POLLS

    if (running && !wasRunning) {
      const launchTime = await getRobloxLaunchTime()
      sessionStart =
        launchTime !== null ? launchTime - LOG_CREATE_BUFFER_MS : Date.now() - LAUNCH_TIME_FALLBACK_WINDOW_MS
      console.log(
        `[roblox-watcher] Roblox detected running - scanning log files from ${new Date(sessionStart).toISOString()}` +
        (launchTime === null ? ' (launch time query failed, using fallback window)' : '')
      )
      fileBaselines.clear()
      initializing = true
    } else if (!running && wasRunning) {
      clearActivity()
    }
    wasRunning = running

    if (running || initializing) {
      const files = await getRecentLogFiles(logDir, sessionStart)
      let alreadyInGame: { jobId: string; placeId: string } | null = null
      let grew = false

      for (const filePath of files) {
        const content = await readText(filePath)
        const knownBaseline = fileBaselines.get(filePath)

        if (knownBaseline === undefined) {
          fileBaselines.set(filePath, content.length)
          if (initializing) {
            const last = findLastMatch(content)
            if (last) alreadyInGame = last
          }
          continue
        }

        if (content.length !== knownBaseline) grew = true
        const baseline = content.length < knownBaseline ? 0 : knownBaseline
        fileBaselines.set(filePath, content.length)
        scanFile(content, baseline)
      }

      if (initializing) {
        if (alreadyInGame) {
          console.log('[roblox-watcher] found existing join on startup:', alreadyInGame)
          report(alreadyInGame.jobId, alreadyInGame.placeId)
        } else {
          console.log(`[roblox-watcher] no existing join found among ${files.length} recent log file(s)`)
        }
        initializing = false
      }

      if (grew) lastLogGrowthAt = Date.now()

      if (inGame && Date.now() - lastLogGrowthAt > STALE_SESSION_MS) {
        console.log('[roblox-watcher] no log activity for a while - treating the game session as ended')
        clearActivity()
      }
    }

    if (!cancelled) setTimeout(() => void poll(), POLL_INTERVAL_MS)
  }

  void poll()

  return () => {
    cancelled = true
  }
}
