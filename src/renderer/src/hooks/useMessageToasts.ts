import { useEffect, useRef } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { usersApi } from '@renderer/lib/usersApi'
import { showToast } from '@renderer/lib/toast'
import { chatKey } from '@renderer/lib/messagesApi'
import { mentionsToText } from '@renderer/lib/messageFormatting'

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
  const { token } = useAuth()
  const namesRef = useRef(new Map<string, string>())

  const locationRef = useRef(location)
  locationRef.current = location

  useEffect(() => {
    return subscribe((message) => {
      const isGroup = message.action === 'group_message_received'
      if (message.action !== 'message_received' && !isGroup) return
      if (locationRef.current === 'messages' && document.hasFocus()) return

      const data = message.data as RealtimeMessagePayload | undefined
      const senderId = data?.sender_id ?? data?.user_id
      if (!data || typeof senderId !== 'string') return
      if (isGroup && typeof data.group_id !== 'string') return
      const key = isGroup ? chatKey({ kind: 'group', id: data.group_id as string }) : senderId

      const notify = (name?: string): void => {
        showToast(name ? (isGroup ? `${name} in a group chat` : name) : isGroup ? 'New group message' : 'New message', {
          description: data.content
            ? truncate(mentionsToText(data.content, (id) => namesRef.current.get(id) ?? 'someone'))
            : 'Check your messages.',
          analyticsType: 'message',
          action: {
            label: 'Open chat',
            onClick: () => onOpenChat(key)
          }
        })
      }

      const cached = namesRef.current.get(senderId)
      if (cached || !token) {
        notify(cached)
        return
      }
      usersApi
        .get(token, senderId)
        .then((user) => {
          const name = user.global_name && user.global_name !== 'None' ? user.global_name : user.username
          if (name) namesRef.current.set(senderId, name)
          notify(name)
        })
        .catch(() => notify())
    })
  }, [subscribe, onOpenChat, token])
}
