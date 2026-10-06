import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { messagesApi } from '@renderer/lib/messagesApi'

export function useUnreadCount(): { unread: number; refresh: () => void } {
  const { token } = useAuth()
  const { subscribe } = useRealtime()
  const [unread, setUnread] = useState(0)

  const refresh = useCallback(() => {
    if (!token) return
    messagesApi
      .unreadCount(token)
      .then((res) => setUnread(res.unread))
      .catch(() => {
      })
  }, [token])

  useEffect(() => refresh(), [refresh])

  useEffect(() => {
    return subscribe((message) => {
      if (message.action === 'message_received') {
        refresh()
      }
    })
  }, [subscribe, refresh])

  return { unread, refresh }
}
