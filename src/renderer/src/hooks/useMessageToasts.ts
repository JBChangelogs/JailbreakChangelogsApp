import { useEffect, useRef } from 'react'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { showToast } from '@renderer/lib/toast'
import { chatKey } from '@renderer/lib/messagesApi'

const PREVIEW_MAX_LENGTH = 140

interface RealtimeMessagePayload {
  id?: string
  sender_id?: string
  user_id?: string
  group_id?: string
  content?: string
}

function truncate(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length <= PREVIEW_MAX_LENGTH) return trimmed
  return `${trimmed.slice(0, PREVIEW_MAX_LENGTH - 1)}…`
}

// onOpenChat receives a chat key (see chatKey in messagesApi).
export function useMessageToasts(onOpenChat: (key: string) => void): void {
  const { subscribe, location } = useRealtime()

  const locationRef = useRef(location)
  locationRef.current = location

  useEffect(() => {
    return subscribe((message) => {
      const isGroup = message.action === 'group_message_received'
      if (message.action !== 'message_received' && !isGroup) return
      if (locationRef.current === 'messages') return

      const data = message.data as RealtimeMessagePayload | undefined
      const senderId = data?.sender_id ?? data?.user_id
      if (!data || typeof senderId !== 'string') return
      if (isGroup && typeof data.group_id !== 'string') return
      const key = isGroup ? chatKey({ kind: 'group', id: data.group_id as string }) : senderId

      showToast(isGroup ? 'New group message' : 'New message', {
        description: data.content ? truncate(data.content) : 'Check your messages.',
        action: {
          label: 'Open chat',
          onClick: () => onOpenChat(key)
        }
      })
    })
  }, [subscribe, onOpenChat])
}
