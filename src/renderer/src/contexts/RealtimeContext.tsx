import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import type { UserPresence } from '@shared/user'

const REALTIME_URL = 'wss://api.jailbreakchangelogs.com/realtime'
const PING_INTERVAL_MS = 25_000
const RECONNECT_BASE_MS = 2_000
const RECONNECT_MAX_MS = 30_000
const LOCATION_PING_MIN_GAP_MS = 5_000
const TYPING_CLEAR_MS = 9_000

export interface RealtimeMessage {
  action?: string
  data?: unknown
}

type RealtimeListener = (message: RealtimeMessage) => void

interface RealtimeContextValue {
  send: (payload: Record<string, unknown>) => void
  subscribe: (listener: RealtimeListener) => () => void
  setLocation: (location: string | null) => void
  location: string | null
  typingUserIds: Set<string>
  presenceOverrides: Map<string, UserPresence>
  robloxActivity: Map<string, RobloxActivityOverride>
}

export interface RobloxActivityOverride {
  placeId: string | null
  jobId: string | null
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

export function RealtimeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { token } = useAuth()

  const socketRef = useRef<WebSocket | null>(null)
  const listenersRef = useRef<Set<RealtimeListener>>(new Set())
  const locationRef = useRef<string | null>(null)
  const [location, setLocationState] = useState<string | null>(null)
  const lastLocationSentAtRef = useRef(0)
  const pendingLocationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set())
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const [presenceOverrides, setPresenceOverrides] = useState<Map<string, UserPresence>>(new Map())
  const [robloxActivity, setRobloxActivity] = useState<Map<string, RobloxActivityOverride>>(new Map())

  const applyPresenceUpdate = useCallback((userId: string, status: string) => {
    setPresenceOverrides((prev) => {
      const next = new Map(prev)
      next.set(userId, { status, last_updated: Math.floor(Date.now() / 1000) })
      return next
    })
  }, [])

  const applyRobloxActivityUpdate = useCallback((userId: string, placeId: string | null, jobId: string | null) => {
    setRobloxActivity((prev) => {
      const next = new Map(prev)
      next.set(userId, { placeId, jobId })
      return next
    })
  }, [])

  const markTyping = useCallback((userId: string) => {
    const existing = typingTimeoutsRef.current.get(userId)
    if (existing) clearTimeout(existing)
    typingTimeoutsRef.current.set(
      userId,
      setTimeout(() => {
        typingTimeoutsRef.current.delete(userId)
        setTypingUserIds((prev) => {
          if (!prev.has(userId)) return prev
          const next = new Set(prev)
          next.delete(userId)
          return next
        })
      }, TYPING_CLEAR_MS)
    )
    setTypingUserIds((prev) => (prev.has(userId) ? prev : new Set(prev).add(userId)))
  }, [])

  const clearTyping = useCallback((userId: string) => {
    const existing = typingTimeoutsRef.current.get(userId)
    if (existing) {
      clearTimeout(existing)
      typingTimeoutsRef.current.delete(userId)
    }
    setTypingUserIds((prev) => {
      if (!prev.has(userId)) return prev
      const next = new Set(prev)
      next.delete(userId)
      return next
    })
  }, [])

  useEffect(() => {
    return () => {
      if (pendingLocationTimeoutRef.current) clearTimeout(pendingLocationTimeoutRef.current)
      for (const timeout of typingTimeoutsRef.current.values()) clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (!token) return

    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let pingInterval: ReturnType<typeof setInterval> | null = null
    let reconnectDelay = RECONNECT_BASE_MS

    const connect = (): void => {
      if (cancelled) return

      const url = `${REALTIME_URL}?application=true&token=${encodeURIComponent(token)}`
      const socket = new WebSocket(url)
      socketRef.current = socket

      socket.onopen = () => {
        reconnectDelay = RECONNECT_BASE_MS
        sendLocationPing(locationRef.current)
        pingInterval = setInterval(() => {
          sendLocationPing(locationRef.current)
        }, PING_INTERVAL_MS)
      }

      socket.onmessage = (event: MessageEvent<string>) => {
        let message: RealtimeMessage
        try {
          message = JSON.parse(event.data)
        } catch {
          return
        }

        if (message.action === 'typing') {
          const userId = (message.data as { user_id?: string } | undefined)?.user_id
          if (userId) markTyping(userId)
        } else if (message.action === 'message_received' || message.action === 'message_sent') {
          const data = message.data as { sender_id?: string; user_id?: string } | undefined
          const senderId = data?.sender_id ?? data?.user_id
          if (senderId) clearTyping(senderId)
        } else if (message.action === 'presence_update') {
          const data = message.data as { user_id?: string; status?: string } | undefined
          if (data?.user_id && data.status) applyPresenceUpdate(data.user_id, data.status)
        } else if (message.action === 'roblox_activity_update') {
          const data = message.data as { user_id?: string; place_id?: string | null; job_id?: string | null } | undefined
          if (data?.user_id) applyRobloxActivityUpdate(data.user_id, data.place_id ?? null, data.job_id ?? null)
        }

        for (const listener of listenersRef.current) listener(message)
      }

      socket.onclose = () => {
        if (pingInterval) {
          clearInterval(pingInterval)
          pingInterval = null
        }
        socketRef.current = null
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, reconnectDelay)
          reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS)
        }
      }

      socket.onerror = () => socket.close()
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (pingInterval) clearInterval(pingInterval)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [token, markTyping, clearTyping, applyPresenceUpdate, applyRobloxActivityUpdate])

  const send = useCallback((payload: Record<string, unknown>) => {
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload))
  }, [])

  const subscribe = useCallback((listener: RealtimeListener) => {
    listenersRef.current.add(listener)
    return () => listenersRef.current.delete(listener)
  }, [])

  const sendLocationPing = useCallback((loc: string | null) => {
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ping', ...(loc ? { app_location: loc } : {}) }))
    }
    lastLocationSentAtRef.current = Date.now()
  }, [])

  const reportLocation = useCallback(
    (loc: string | null) => {
      if (pendingLocationTimeoutRef.current) {
        clearTimeout(pendingLocationTimeoutRef.current)
        pendingLocationTimeoutRef.current = null
      }
      const elapsed = Date.now() - lastLocationSentAtRef.current
      if (elapsed >= LOCATION_PING_MIN_GAP_MS) {
        sendLocationPing(loc)
      } else {
        pendingLocationTimeoutRef.current = setTimeout(() => {
          pendingLocationTimeoutRef.current = null
          sendLocationPing(locationRef.current)
        }, LOCATION_PING_MIN_GAP_MS - elapsed)
      }
    },
    [sendLocationPing]
  )

  const setLocation = useCallback(
    (next: string | null) => {
      locationRef.current = next
      setLocationState(next)
      reportLocation(next)
    },
    [reportLocation]
  )

  const value = useMemo(
    () => ({ send, subscribe, setLocation, location, typingUserIds, presenceOverrides, robloxActivity }),
    [send, subscribe, setLocation, location, typingUserIds, presenceOverrides, robloxActivity]
  )

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useRealtime must be used within a RealtimeProvider')
  return ctx
}
