import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { notificationsApi } from '@renderer/lib/notificationsApi'

export function useNotificationCount(): { count: number; refresh: () => void; setCount: (n: number) => void } {
  const { token } = useAuth()
  const { subscribe } = useRealtime()
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    if (!token) return
    notificationsApi
      .unreadCount(token)
      .then((res) => setCount(res.unread_count))
      .catch(() => {
      })
  }, [token])

  useEffect(() => refresh(), [refresh])

  useEffect(() => {
    return subscribe((message) => {
      if (message.action === 'notification_received') refresh()
    })
  }, [subscribe, refresh])

  return { count, refresh, setCount }
}
