import { useEffect, useState } from 'react'
import { fetchUptimeStatus } from '@renderer/lib/uptimeApi'
import { useRealtime, type RealtimeMessage } from '@renderer/contexts/RealtimeContext'
import type { UptimeHeartbeat, UptimeMonitorStatus } from '@shared/uptimeStatus'

const POLL_INTERVAL_MS = 30_000

export type UptimeState = 'up' | 'down' | 'pending' | 'maintenance' | 'unknown'

function stateFromStatusCode(code: number | undefined): UptimeState {
  switch (code) {
    case 1:
      return 'up'
    case 0:
      return 'down'
    case 2:
      return 'pending'
    case 3:
      return 'maintenance'
    default:
      return 'unknown'
  }
}

export function useUptimeMonitor(monitorName: string): {
  state: UptimeState
  heartbeats: UptimeHeartbeat[]
  uptime24h: number | null
  loading: boolean
} {
  const [status, setStatus] = useState<UptimeMonitorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const { subscribe } = useRealtime()

  useEffect(() => {
    let cancelled = false

    const load = (): void => {
      fetchUptimeStatus(monitorName)
        .then((data) => {
          if (!cancelled) setStatus(data)
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [monitorName])

  useEffect(() => {
    return subscribe((message: RealtimeMessage) => {
      if (message.action !== 'monitor_status_update') return
      const data = message.data as { name?: string; status?: number; uptime24h?: number } | undefined
      if (data?.name !== monitorName || typeof data.status !== 'number') return

      setStatus((prev) => {
        const heartbeat = { status: data.status as number, time: new Date().toISOString(), msg: '', ping: null }
        if (!prev) {
          return { id: 0, name: monitorName, uptime24h: data.uptime24h ?? 1, heartbeats: [heartbeat] }
        }
        return {
          ...prev,
          uptime24h: typeof data.uptime24h === 'number' ? data.uptime24h : prev.uptime24h,
          heartbeats: [...prev.heartbeats, heartbeat]
        }
      })
      setLoading(false)
    })
  }, [subscribe, monitorName])

  const heartbeats = status?.heartbeats ?? []
  const latestHeartbeat = heartbeats[heartbeats.length - 1]

  return {
    state: stateFromStatusCode(latestHeartbeat?.status),
    heartbeats,
    uptime24h: status?.uptime24h ?? null,
    loading
  }
}
