import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { messagesApi, type ConversationSummary } from '@renderer/lib/messagesApi'

export function useConversations(): {
  conversations: ConversationSummary[]
  loading: boolean
  error: string | null
  refresh: () => void
  hideConversation: (recipientId: string) => Promise<void>
  unhideConversation: (recipientId: string) => Promise<void>
  markConversationRead: (recipientId: string) => void
} {
  const { token } = useAuth()
  const { subscribe } = useRealtime()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const refresh = useCallback(() => {
    if (!token) return
    const requestId = ++requestIdRef.current
    setLoading(true)
    messagesApi
      .listConversations(token)
      .then((res) => {
        if (requestId !== requestIdRef.current) return
        setConversations(res.conversations)
        setError(null)
      })
      .catch((err: unknown) => {
        if (requestId !== requestIdRef.current) return
        setError(err instanceof Error ? err.message : 'Failed to load conversations')
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoading(false)
      })
  }, [token])

  useEffect(() => refresh(), [refresh])

  useEffect(() => {
    return subscribe((message) => {
      if (message.action === 'message_received' || message.action === 'message_sent') {
        refresh()
      }
    })
  }, [subscribe, refresh])

  const hideConversation = useCallback(
    async (recipientId: string) => {
      if (!token) return
      setConversations((prev) => prev.filter((c) => c.recipient_id !== recipientId))
      try {
        await messagesApi.hideConversation(token, recipientId)
      } catch (err) {
        refresh()
        throw err
      }
    },
    [token, refresh]
  )

  const unhideConversation = useCallback(
    async (recipientId: string) => {
      if (!token) return
      await messagesApi.unhideConversation(token, recipientId)
      refresh()
    },
    [token, refresh]
  )

  const markConversationRead = useCallback((recipientId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.recipient_id === recipientId ? { ...c, unread_count: 0 } : c))
    )
  }, [])

  return {
    conversations,
    loading,
    error,
    refresh,
    hideConversation,
    unhideConversation,
    markConversationRead
  }
}
