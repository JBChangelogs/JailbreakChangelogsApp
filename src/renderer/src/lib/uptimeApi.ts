import type { UptimeMonitorStatus } from '@shared/uptimeStatus'

const API_BASE = 'https://api.jailbreakchangelogs.com'

export async function fetchUptimeStatus(monitorName: string): Promise<UptimeMonitorStatus> {
  const res = await fetch(`${API_BASE}/v2/monitors/${encodeURIComponent(monitorName)}`)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}
