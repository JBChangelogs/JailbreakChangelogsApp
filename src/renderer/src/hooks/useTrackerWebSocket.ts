import { useCallback, useEffect, useRef, useState } from 'react'

const INVENTORY_WS_URL = 'wss://inventories.jailbreakchangelogs.com'
const INVENTORY_API_URL = 'https://inventories.jailbreakchangelogs.com'

const PING_MSG = JSON.stringify({ action: 'ping' })
const MAX_RECONNECT_ATTEMPTS = 5
const PING_INTERVAL_MS = 30_000
const IDLE_TIMEOUT_MS = 3 * 60 * 1000
const RECONNECT_BASE_DELAY_MS = 1_000
const RECONNECT_MAX_DELAY_MS = 16_000

function getReconnectDelay(attempt: number): number {
  return Math.min(RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt - 1), RECONNECT_MAX_DELAY_MS)
}

interface TrackerWebSocketOptions {
  endpoint: string
  messageAction: string
  enabled: boolean
  token: string | null
  userId?: string | null
  logPrefix: string
}

interface TrackerRosterUser {
  user_id: string
  display_name: string
  joined_at: number
}

export interface JoinRosterEntry {
  userId: string
  displayName: string
  joinedAt: number
}

function toRosterEntry(user: TrackerRosterUser): JoinRosterEntry {
  return { userId: user.user_id, displayName: user.display_name, joinedAt: user.joined_at }
}

export interface TrackerWebSocketReturn<TData> {
  data: TData[]
  joinRosters: Map<string, JoinRosterEntry[]>
  send: (payload: Record<string, unknown>) => void
  isConnected: boolean
  isConnecting: boolean
  isIdle: boolean
  error: string | undefined
  requiresManualReconnect: boolean
  isBanned: boolean
  banRemainingSeconds: number | null
  reconnect: () => void
  reconnectFromBan: () => void
  checkBanStatus: () => Promise<void>
}

export function useTrackerWebSocket<TData = unknown>({
  endpoint,
  messageAction,
  enabled,
  token,
  userId,
  logPrefix
}: TrackerWebSocketOptions): TrackerWebSocketReturn<TData> {
  const [data, setData] = useState<TData[]>([])
  const [joinRosters, setJoinRosters] = useState<Map<string, JoinRosterEntry[]>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isIdle, setIsIdle] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [requiresManualReconnect, setRequiresManualReconnect] = useState(false)
  const [isBanned, setIsBanned] = useState(false)
  const [banRemainingSeconds, setBanRemainingSeconds] = useState<number | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const connectRef = useRef<(() => void) | null>(null)
  const requiresManualReconnectRef = useRef(false)
  const isBannedRef = useRef(false)
  const isIdleRef = useRef(false)
  const isVisibleRef = useRef(true)
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect')
      wsRef.current = null
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
    setError(undefined)
  }, [])

  const connect = useCallback(
    (force = false) => {
      if (!enabled || !token) return
      if ((requiresManualReconnectRef.current || isBannedRef.current) && !force) return
      if (
        wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING
      )
        return

      try {
        const separator = endpoint.includes('?') ? '&' : '?'
        const wsUrl = `${INVENTORY_WS_URL}${endpoint}${separator}token=${encodeURIComponent(token)}`
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.addEventListener('open', () => {
          setIsConnected(true)
          setIsConnecting(false)
          setIsIdle(false)
          setError(undefined)
          setRequiresManualReconnect(false)
          requiresManualReconnectRef.current = false
          setIsBanned(false)
          setBanRemainingSeconds(null)
          isBannedRef.current = false
          reconnectAttemptsRef.current = 0

          pingIntervalRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              try {
                wsRef.current.send(PING_MSG)
              } catch (err) {
                console.error(`${logPrefix}: Ping send failed`, err)
              }
            }
          }, PING_INTERVAL_MS)
        })

        ws.addEventListener('message', (event) => {
          try {
            const msg = JSON.parse(event.data as string) as {
              action: string
              data?: unknown
              servers?: Record<string, TrackerRosterUser[]>
              users?: TrackerRosterUser[]
            }
            if (msg.action === messageAction && Array.isArray(msg.data)) {
              setData(msg.data as TData[])
            } else if (msg.action === 'join_history_sync' && msg.servers) {
              const next = new Map<string, JoinRosterEntry[]>()
              for (const [serverId, users] of Object.entries(msg.servers)) {
                next.set(serverId, users.map(toRosterEntry))
              }
              setJoinRosters(next)
            } else if (msg.action === 'update_join_history') {
              const serverId = (msg.data as { server_id?: string } | undefined)?.server_id
              if (serverId && msg.users) {
                const entries = msg.users.map(toRosterEntry)
                setJoinRosters((prev) => {
                  const next = new Map(prev)
                  next.set(serverId, entries)
                  return next
                })
              }
            }
          } catch (err) {
            console.error(`${logPrefix}: Parse error`, err)
            setError('Failed to parse server response')
          }
        })

        ws.addEventListener('close', (event) => {
          setIsConnected(false)
          setIsConnecting(false)

          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current)
            pingIntervalRef.current = null
          }

          if (event.code === 4004) {
            const match = (event.reason ?? '').match(/remaining seconds:\s*(\d+)/i)
            const remaining = match ? Number(match[1]) : null
            setIsBanned(true)
            setBanRemainingSeconds(Number.isFinite(remaining) ? remaining : null)
            isBannedRef.current = true
            setError('You have been banned from using the tracker.')
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current)
              reconnectTimeoutRef.current = null
            }
            return
          }

          if (event.code === 4005) {
            setRequiresManualReconnect(true)
            requiresManualReconnectRef.current = true
            setError('Connected from another device/tab')
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current)
              reconnectTimeoutRef.current = null
            }
            return
          }

          if (enabled && event.code !== 1000 && !isIdleRef.current && isVisibleRef.current) {
            if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttemptsRef.current++
              const delay = getReconnectDelay(reconnectAttemptsRef.current)
              reconnectTimeoutRef.current = setTimeout(() => {
                setIsConnecting(true)
                connectRef.current?.()
              }, delay)
            } else {
              setError(
                'Connection lost. Unable to reconnect after multiple attempts. Please restart the app to reconnect.'
              )
            }
          }
        })

        ws.addEventListener('error', () => {
          console.error(`${logPrefix}: Socket error`)
          setError('Connection error')
          setIsConnected(false)
        })
      } catch (err) {
        console.error(`${logPrefix}: Connection error`, err)
        setError('Connection error')
      }
    },
    [enabled, endpoint, messageAction, token, logPrefix]
  )

  const reconnect = useCallback(() => {
    if (!enabled) return
    setRequiresManualReconnect(false)
    requiresManualReconnectRef.current = false
    setError(undefined)
    reconnectAttemptsRef.current = 0
    setIsConnecting(true)
    connect(true)
  }, [connect, enabled])

  const reconnectFromBan = useCallback(() => {
    if (!enabled) return
    setIsBanned(false)
    setBanRemainingSeconds(null)
    isBannedRef.current = false
    setError(undefined)
    reconnectAttemptsRef.current = 0
    setIsConnecting(true)
    connect(true)
  }, [connect, enabled])

  const checkBanStatus = useCallback(async () => {
    if (!userId) return
    try {
      const response = await fetch(
        `${INVENTORY_API_URL}/tracker/ban?user_id=${encodeURIComponent(userId)}`
      )
      if (!response.ok) throw new Error('Ban status check failed')
      const result = (await response.json()) as {
        user_id: string | number
        banned: boolean
        remaining_seconds: number
      }

      if (result.banned) {
        setIsBanned(true)
        setBanRemainingSeconds(Number.isFinite(result.remaining_seconds) ? result.remaining_seconds : null)
        isBannedRef.current = true
      } else {
        setIsBanned(false)
        setBanRemainingSeconds(null)
        isBannedRef.current = false
        setError(undefined)
        setIsConnecting(true)
        connect(true)
      }
    } catch (err) {
      console.error(`${logPrefix}: Ban status check error`, err)
      setError('Failed to check ban status')
    }
  }, [connect, userId, logPrefix])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    if (!enabled) return undefined

    const resetIdleTimer = (): void => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)

      if (isIdleRef.current) {
        isIdleRef.current = false
        setIsIdle(false)
        if (!requiresManualReconnectRef.current && !isBannedRef.current) {
          setIsConnecting(true)
          connect()
        }
      }

      idleTimeoutRef.current = setTimeout(() => {
        isIdleRef.current = true
        setIsIdle(true)
        disconnect()
      }, IDLE_TIMEOUT_MS)
    }

    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        isVisibleRef.current = false
        setIsIdle(true)
        disconnect()
        if (idleTimeoutRef.current) {
          clearTimeout(idleTimeoutRef.current)
          idleTimeoutRef.current = null
        }
      } else {
        isVisibleRef.current = true
        isIdleRef.current = false
        if (!requiresManualReconnectRef.current && !isBannedRef.current) {
          setIsConnecting(true)
          connect()
        } else {
          setIsConnecting(false)
        }
        resetIdleTimer()
      }
    }

    resetIdleTimer()

    const resetIdleTimerIfVisible = (): void => {
      if (!document.hidden) resetIdleTimer()
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const
    events.forEach((e) => document.addEventListener(e, resetIdleTimerIfVisible))
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const initialConnectTimer = setTimeout(() => {
      if (!document.hidden && !requiresManualReconnectRef.current && !isBannedRef.current) {
        connect()
      }
    }, 0)

    return () => {
      clearTimeout(initialConnectTimer)
      events.forEach((e) => document.removeEventListener(e, resetIdleTimerIfVisible))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current)
      disconnect()
    }
  }, [connect, disconnect, enabled])

  const send = useCallback((payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }
  }, [])

  return {
    data,
    joinRosters,
    send,
    isConnected,
    isConnecting,
    isIdle,
    error,
    requiresManualReconnect,
    isBanned,
    banRemainingSeconds,
    reconnect,
    reconnectFromBan,
    checkBanStatus
  }
}
