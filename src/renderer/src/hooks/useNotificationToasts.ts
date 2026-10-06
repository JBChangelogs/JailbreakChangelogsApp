import { useEffect } from 'react'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { showToast } from '@renderer/lib/toast'

interface NotificationPushPayload {
  type?: string
  data?: {
    title?: string
    description?: string
    link?: string
  }
}

export function useNotificationToasts(): void {
  const { subscribe } = useRealtime()

  useEffect(() => {
    return subscribe((message) => {
      if (message.action !== 'notification_received') return

      const outer = message.data as NotificationPushPayload | undefined
      const inner = outer?.data
      if (!inner) return

      const isBroadcast = outer?.type === 'broadcast'
      showToast(inner.title || 'New notification', {
        description: inner.description,
        accent: isBroadcast ? 'info' : 'default',
        action: inner.link
          ? {
              label: 'View',
              onClick: () => void window.api.openExternal(inner.link!)
            }
          : undefined
      })
    })
  }, [subscribe])
}
