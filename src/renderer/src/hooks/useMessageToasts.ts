import { useEffect, useRef } from 'react'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { showToast } from '@renderer/lib/toast'

const PREVIEW_MAX_LENGTH = 140

interface RealtimeMessagePayload {
  id?: string
  sender_id?: string
  user_id?: string
  content?: string
}

function truncate(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= PREVIEW_MAX_LENGTH) return trimmed
  return `${trimmed.slice(0, PREVIEW_MAX_LENGTH - 1)}…`
}

export function useMessageToasts(onOpenChat: (recipientId: string) => void): void {
  const { subscribe, location } = useRealtime()

  const locationRef = useRef(location)
  locationRef.current = location

  useEffect(() => {
    return subscribe((message) => {
      if (message.action !== 'message_received') return
      if (locationRef.current === 'messages') return

      const data = message.data as RealtimeMessagePayload | undefined
      const senderId = data?.sender_id ?? data?.user_id
      if (!data || typeof senderId !== 'string') return

      showToast('New message', {
        description: data.content ? truncate(data.content) : 'Check your messages.',
        action: {
          label: 'Open chat',
          onClick: () => onOpenChat(senderId)
        }
      })
    })
  }, [subscribe, onOpenChat])
}
