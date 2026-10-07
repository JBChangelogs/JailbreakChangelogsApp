import { useEffect, useRef, useSyncExternalStore } from 'react'
import { showToast } from '@renderer/lib/toast'
import { robberyMarkerToDisplayName } from '@renderer/lib/robberyUtils'
import type { RobberyData } from '@shared/robbery'
import type { BountyData } from '@shared/bounty'
import { track } from '@renderer/lib/analytics'

export interface BountyRange {
  min: number
  max: number
}

export interface TrackerAlertSettings {
  robberyTypes: string[]
  serverBounty: BountyRange | null
  playerBounty: BountyRange | null
}

const STORAGE_KEY = 'trackerAlerts'
const MAX_INDIVIDUAL_ALERTS = 3

function load(): TrackerAlertSettings {
  const empty: TrackerAlertSettings = { robberyTypes: [], serverBounty: null, playerBounty: null }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<TrackerAlertSettings>) } : empty
  } catch {
    return empty
  }
}

let settings = load()
const listeners = new Set<() => void>()

export function getTrackerAlerts(): TrackerAlertSettings {
  return settings
}

const rangeLabel = (r: BountyRange): string => `${r.min}-${r.max || 'max'}`

export function updateTrackerAlerts(patch: Partial<TrackerAlertSettings>): void {
  for (const type of patch.robberyTypes ?? []) {
    if (!settings.robberyTypes.includes(type)) track('tracker_alert_set', { kind: 'robbery', robbery_type: type })
  }
  if (patch.serverBounty) track('tracker_alert_set', { kind: 'server_bounty', range: rangeLabel(patch.serverBounty) })
  if (patch.playerBounty) track('tracker_alert_set', { kind: 'player_bounty', range: rangeLabel(patch.playerBounty) })
  settings = { ...settings, ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {}
  for (const listener of listeners) listener()
}

export function useTrackerAlerts(): TrackerAlertSettings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => settings
  )
}

export function hasRobberyAlerts(s: TrackerAlertSettings): boolean {
  return s.robberyTypes.length > 0
}

export function hasBountyAlerts(s: TrackerAlertSettings): boolean {
  return s.serverBounty !== null || s.playerBounty !== null
}

function inRange(value: number, range: BountyRange | null): boolean {
  return range !== null && value >= range.min && (range.max === 0 || value <= range.max)
}

function notifyAll(
  kind: 'robbery' | 'bounty',
  alerts: { title: string; description: string }[],
  summary: string,
  onClick: () => void
): void {
  track('alert_fired', { kind, count: alerts.length })
  const action = { label: 'View', onClick }
  if (alerts.length > MAX_INDIVIDUAL_ALERTS) {
    showToast(summary, { description: 'Open the tracker to see them.', action, accent: 'info', analyticsType: `${kind}_alert` })
    return
  }
  for (const alert of alerts) {
    showToast(alert.title, { description: alert.description, action, accent: 'info', analyticsType: `${kind}_alert` })
  }
}

const isOpen = (r: RobberyData): boolean => r.status === 1 || r.status === 2
const robberyKey = (r: RobberyData): string => `${r.server?.job_id ?? r.job_id}:${r.marker_name}`

export function useRobberyAlerts(robberies: RobberyData[], onClick: () => void): void {
  const previousOpen = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (robberies.length === 0) return
    const open = robberies.filter(isOpen)
    const previous = previousOpen.current
    previousOpen.current = new Set(open.map(robberyKey))
    if (previous === null) return

    const types = new Set(getTrackerAlerts().robberyTypes)
    const fresh = open.filter((r) => types.has(r.marker_name) && !previous.has(robberyKey(r)))
    if (fresh.length === 0) return

    notifyAll(
      'robbery',
      fresh.map((r) => {
        const players = r.server?.players?.length
        const country = r.region_data?.country
        return {
          title: `${robberyMarkerToDisplayName(r.marker_name, r.name)} is open`,
          description: [players != null ? `${players} players` : null, country].filter(Boolean).join(' · ') || 'New server'
        }
      }),
      `${fresh.length} watched robberies just opened`,
      onClick
    )
  }, [robberies, onClick])
}

export function useBountyAlerts(bounties: BountyData[], onClick: () => void): void {
  const previous = useRef<{ servers: Map<string, number>; players: Map<string, number> } | null>(null)

  useEffect(() => {
    if (bounties.length === 0) return
    const servers = new Map<string, number>()
    const players = new Map<string, number>()
    const names = new Map<string, string>()
    for (const b of bounties) {
      const serverId = b.server?.job_id
      if (!serverId) continue
      servers.set(serverId, (servers.get(serverId) ?? 0) + b.bounty)
      const playerKey = `${serverId}:${b.userid}`
      players.set(playerKey, b.bounty)
      names.set(playerKey, b.display_name)
    }
    const prev = previous.current
    previous.current = { servers, players }
    if (prev === null) return

    const { serverBounty, playerBounty } = getTrackerAlerts()
    const entered = (now: Map<string, number>, before: Map<string, number>, range: BountyRange | null): string[] =>
      [...now].filter(([key, value]) => inRange(value, range) && !inRange(before.get(key) ?? -1, range)).map(([key]) => key)

    const alerts = [
      ...entered(servers, prev.servers, serverBounty).map((id) => ({
        title: `Server bounty: ${servers.get(id)!.toLocaleString()}`,
        description: `${bounties.filter((b) => b.server?.job_id === id).length} players with bounties`
      })),
      ...entered(players, prev.players, playerBounty).map((key) => ({
        title: `${names.get(key)} has a ${players.get(key)!.toLocaleString()} bounty`,
        description: 'Player bounty in your alert range'
      }))
    ]
    if (alerts.length === 0) return
    notifyAll('bounty', alerts, `${alerts.length} bounties hit your alert ranges`, onClick)
  }, [bounties, onClick])
}
