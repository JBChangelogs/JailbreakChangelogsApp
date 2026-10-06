export interface UptimeHeartbeat {
  status: number
  time: string
  msg: string
  ping: number | null
}

export interface UptimeMonitorStatus {
  id: number
  name: string
  uptime24h: number
  heartbeats: UptimeHeartbeat[]
}
