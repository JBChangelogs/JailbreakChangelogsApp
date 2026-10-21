import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import {
  groupChatsApi,
  type GroupChat,
  type GroupChatSummary,
  type MessageItem
} from '@renderer/lib/messagesApi'

function lastActivity(group: GroupChatSummary): number {
  return group.message?.created_at ?? group.created_at
}

function sortByActivity(groups: GroupChatSummary[]): GroupChatSummary[] {
  return [...groups].sort((a, b) => lastActivity(b) - lastActivity(a))
}

export function useGroupChats(openGroupId: string | null): {
  groups: GroupChatSummary[]
  loading: boolean
  error: string | null
  upsertGroup: (group: GroupChat) => void
  removeGroup: (groupId: string) => void
  markGroupRead: (groupId: string) => void
} {
  const { token } = useAuth()
  const { subscribe } = useRealtime()
  const [groups, setGroups] = useState<GroupChatSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const openGroupIdRef = useRef(openGroupId)
  openGroupIdRef.current = openGroupId

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    groupChatsApi
      .list(token)
      .then((res) => {
        if (cancelled) return
        setGroups(sortByActivity(res.groups))
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load group chats')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const upsertGroup = useCallback((group: GroupChat) => {
    setGroups((prev) => {
      const existing = prev.find((g) => g.id === group.id)
      const next: GroupChatSummary = {
        ...group,
        unread_count: existing?.unread_count ?? 0,
        message: existing?.message ?? null
      }
      return sortByActivity(existing ? prev.map((g) => (g.id === group.id ? next : g)) : [next, ...prev])
    })
  }, [])

  const removeGroup = useCallback((groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
  }, [])

  const markGroupRead = useCallback((groupId: string) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, unread_count: 0 } : g)))
  }, [])

  useEffect(() => {
    return subscribe((message) => {
      if (message.action === 'group_updated') {
        const group = message.data as GroupChat | undefined
        if (group?.id) upsertGroup(group)
      } else if (message.action === 'group_deleted') {
        const id = (message.data as { id?: string } | undefined)?.id
        if (id) removeGroup(id)
      } else if (message.action === 'group_message_received' || message.action === 'group_message_sent') {
        const data = message.data as (MessageItem & { group_id?: string }) | undefined
        const groupId = data?.group_id
        if (!data || !groupId) return
        const bump = message.action === 'group_message_received' && groupId !== openGroupIdRef.current
        setGroups((prev) =>
          sortByActivity(
            prev.map((g) =>
              g.id === groupId ? { ...g, message: data, unread_count: g.unread_count + (bump ? 1 : 0) } : g
            )
          )
        )
      }
    })
  }, [subscribe, upsertGroup, removeGroup])

  return { groups, loading, error, upsertGroup, removeGroup, markGroupRead }
}
