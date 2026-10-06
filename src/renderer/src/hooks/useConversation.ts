import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import {
  messagesApi,
  type MessageItem,
  type RawSentMessage,
  type OutgoingMessageMetadata
} from '@renderer/lib/messagesApi'

interface RealtimeMessagePayload {
  id?: string
  parent_id?: string | null
  sender_id?: string
  user_id?: string
  receiver_id?: string
  recipient_id?: string
  content?: string
  metadata?: Record<string, unknown> | null
  created_at?: number
  updated_at?: number
}

interface MessagesReadPayload {
  reader_id?: string
  message_ids?: (string | number)[]
}

export interface DisplayMessage extends MessageItem {
  status?: 'sending' | 'failed'
}

interface ConversationCacheEntry {
  items: DisplayMessage[]
  page: number
  totalPages: number
}

const LOCAL_ID_PREFIX = 'local-'

function normalizeSentMessage(
  raw: RawSentMessage,
  fallback: {
    senderId: string
    receiverId: string
    createdAt?: number
    metadata?: Record<string, unknown> | null
  }
): MessageItem {
  return {
    id: raw.id,
    parent_id: raw.parent_id,
    content: raw.content,
    sender_id: raw.sender_id ?? raw.user_id ?? fallback.senderId,
    receiver_id: raw.receiver_id ?? raw.recipient_id ?? fallback.receiverId,
    created_at: raw.created_at ?? fallback.createdAt ?? Math.floor(Date.now() / 1000),
    metadata: raw.metadata ?? fallback.metadata ?? null,
    read_at: raw.read_at ?? null
  }
}

export function useConversation(
  recipientId: string | null,
  currentUserId: string | null = null,
  onRead?: () => void
): {
  items: DisplayMessage[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadOlder: () => void
  sendMessage: (content: string, parentId?: string | null, metadata?: OutgoingMessageMetadata) => Promise<void>
  retrySend: (localId: string) => Promise<void>
  discardFailedSend: (localId: string) => void
  editMessage: (messageId: string, content: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  reportMessage: (messageId: string, reason: string) => Promise<void>
  notifyTyping: () => void
} {
  const { token } = useAuth()
  const { subscribe, send } = useRealtime()

  const notifyTyping = useCallback(() => {
    if (!recipientId) return
    send({ type: 'typing', recipient_id: recipientId })
  }, [recipientId, send])

  const cacheRef = useRef<Map<string, ConversationCacheEntry>>(new Map())

  const [items, setItems] = useState<DisplayMessage[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onReadRef = useRef(onRead)
  onReadRef.current = onRead

  const updateItems = useCallback(
    (updater: (prev: DisplayMessage[]) => DisplayMessage[]) => {
      if (!recipientId) return
      setItems((prev) => {
        const next = updater(prev)
        cacheRef.current.set(recipientId, { items: next, page, totalPages })
        return next
      })
    },
    [recipientId, page, totalPages]
  )

  useEffect(() => {
    setError(null)

    if (!recipientId) {
      setItems([])
      setPage(1)
      setTotalPages(1)
      setLoading(false)
      return
    }

    const cached = cacheRef.current.get(recipientId)
    setItems(cached?.items ?? [])
    setPage(cached?.page ?? 1)
    setTotalPages(cached?.totalPages ?? 1)

    if (!token) return

    let cancelled = false
    setLoading(true)

    messagesApi
      .getConversation(token, recipientId, 1)
      .then((res) => {
        if (cancelled) return
        const freshItems = [...res.items].reverse()
        cacheRef.current.set(recipientId, {
          items: freshItems,
          page: 1,
          totalPages: res.total_pages
        })
        setItems(freshItems)
        setTotalPages(res.total_pages)
        setPage(1)
        onReadRef.current?.()
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, recipientId])

  const loadOlder = useCallback(() => {
    if (!token || !recipientId || loading || page >= totalPages) return
    const nextPage = page + 1
    setLoading(true)
    messagesApi
      .getConversation(token, recipientId, nextPage)
      .then((res) => {
        setItems((prev) => {
          const merged = [...[...res.items].reverse(), ...prev]
          cacheRef.current.set(recipientId, {
            items: merged,
            page: nextPage,
            totalPages: res.total_pages
          })
          return merged
        })
        setPage(nextPage)
        setTotalPages(res.total_pages)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      })
      .finally(() => setLoading(false))
  }, [token, recipientId, page, totalPages, loading])

  const attemptSend = useCallback(
    async (
      localId: string,
      content: string,
      parentId: string | null,
      metadata?: OutgoingMessageMetadata
    ) => {
      if (!token || !recipientId) return
      try {
        const raw = await messagesApi.sendMessage(token, recipientId, content, parentId, metadata)
        const sent = normalizeSentMessage(raw, {
          senderId: currentUserId ?? '',
          receiverId: recipientId,
          metadata: metadata ?? null
        })
        updateItems((prev) => {
          const withoutPending = prev.filter((m) => m.id !== localId)
          if (withoutPending.some((m) => m.id === sent.id)) return withoutPending
          return [...withoutPending, sent]
        })
      } catch (err) {
        updateItems((prev) =>
          prev.map((m) => (m.id === localId ? { ...m, status: 'failed' as const } : m))
        )
        throw err
      }
    },
    [token, recipientId, currentUserId, updateItems]
  )

  const sendMessage = useCallback(
    async (content: string, parentId: string | null = null, metadata?: OutgoingMessageMetadata) => {
      if (!token || !recipientId) return
      const localId = `${LOCAL_ID_PREFIX}${crypto.randomUUID()}`
      const optimistic: DisplayMessage = {
        id: localId,
        parent_id: parentId,
        sender_id: currentUserId ?? '',
        receiver_id: recipientId,
        content,
        metadata: metadata ?? null,
        created_at: Math.floor(Date.now() / 1000),
        read_at: null,
        status: 'sending'
      }
      updateItems((prev) => [...prev, optimistic])
      await attemptSend(localId, content, parentId, metadata).catch(() => {})
    },
    [token, recipientId, currentUserId, updateItems, attemptSend]
  )

  const retrySend = useCallback(
    async (localId: string) => {
      const pending = items.find((m) => m.id === localId)
      if (!pending) return
      updateItems((prev) =>
        prev.map((m) => (m.id === localId ? { ...m, status: 'sending' as const } : m))
      )
      await attemptSend(
        localId,
        pending.content,
        pending.parent_id,
        pending.metadata as OutgoingMessageMetadata | undefined
      ).catch(() => {})
    },
    [items, updateItems, attemptSend]
  )

  const discardFailedSend = useCallback(
    (localId: string) => {
      updateItems((prev) => prev.filter((m) => m.id !== localId))
    },
    [updateItems]
  )

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!token || !recipientId) return
      const existing = items.find((m) => m.id === messageId)
      const raw = await messagesApi.editMessage(
        token,
        recipientId,
        messageId,
        content,
        existing?.parent_id ?? null
      )
      const updated: MessageItem = {
        ...normalizeSentMessage(raw, {
          senderId: existing?.sender_id ?? currentUserId ?? '',
          receiverId: existing?.receiver_id ?? recipientId,
          createdAt: existing?.created_at
        }),
        updated_at: raw.updated_at ?? Math.floor(Date.now() / 1000)
      }
      updateItems((prev) => prev.map((m) => (m.id === messageId ? updated : m)))
    },
    [token, recipientId, items, currentUserId, updateItems]
  )

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!token || !recipientId) return
      await messagesApi.deleteMessage(token, recipientId, messageId)
      updateItems((prev) => prev.filter((m) => m.id !== messageId))
    },
    [token, recipientId, updateItems]
  )

  const reportMessage = useCallback(
    async (messageId: string, reason: string) => {
      if (!token || !recipientId) return
      await messagesApi.reportMessage(token, recipientId, messageId, reason)
    },
    [token, recipientId]
  )

  useEffect(() => {
    if (!recipientId) return

    return subscribe((message) => {
      if (message.action === 'messages_read') {
        const readData = message.data as MessagesReadPayload | undefined
        if (readData?.reader_id !== recipientId || !Array.isArray(readData.message_ids)) return
        const readIds = new Set(readData.message_ids.map(String))
        const readAt = Math.floor(Date.now() / 1000)
        updateItems((prev) =>
          prev.map((m) => (readIds.has(String(m.id)) ? { ...m, read_at: m.read_at ?? readAt } : m))
        )
        return
      }

      const data = message.data as RealtimeMessagePayload | undefined
      if (!data || typeof data.id !== 'string') return

      if (message.action === 'message_received' || message.action === 'message_sent') {
        const senderId = data.sender_id ?? data.user_id
        const receiverId = data.receiver_id ?? data.recipient_id
        if (senderId !== recipientId && receiverId !== recipientId) return

        const normalized: MessageItem = {
          id: data.id,
          parent_id: data.parent_id ?? null,
          sender_id: senderId ?? '',
          receiver_id: receiverId ?? '',
          content: data.content ?? '',
          metadata: data.metadata ?? null,
          created_at: data.created_at ?? Math.floor(Date.now() / 1000),
          read_at: null
        }
        updateItems((prev) =>
          prev.some((m) => m.id === normalized.id) ? prev : [...prev, normalized]
        )

        if (message.action === 'message_received' && senderId === recipientId) {
          send({ type: 'mark_read', sender_id: recipientId })
        }
      } else if (message.action === 'message_edited') {
        updateItems((prev) =>
          prev.map((m) =>
            m.id === data.id
              ? {
                  ...m,
                  content: data.content ?? m.content,
                  updated_at: data.updated_at ?? Math.floor(Date.now() / 1000)
                }
              : m
          )
        )
      } else if (message.action === 'message_deleted') {
        updateItems((prev) => prev.filter((m) => m.id !== data.id))
      }
    })
  }, [recipientId, subscribe, updateItems])

  return {
    items,
    loading,
    error,
    hasMore: page < totalPages,
    loadOlder,
    sendMessage,
    retrySend,
    discardFailedSend,
    editMessage,
    deleteMessage,
    reportMessage,
    notifyTyping
  }
}
