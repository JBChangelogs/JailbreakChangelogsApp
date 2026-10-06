import type { ConversationsResponse, ConversationPage } from '@shared/messages'

export type { MessageItem, ConversationSummary, ConversationPage } from '@shared/messages'

const API_BASE = 'https://api.jailbreakchangelogs.com'

async function request<T>(
  token: string,
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: token,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {})
    },
    body: init?.body ? JSON.stringify(init.body) : undefined
  })

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (typeof data?.message === 'string') message = data.message
    } catch {
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export interface RawSentMessage {
  id: string
  parent_id: string | null
  content: string
  user_id?: string
  sender_id?: string
  recipient_id?: string
  receiver_id?: string
  created_at?: number
  updated_at?: number
  metadata?: Record<string, unknown> | null
  read_at?: number | null
}

interface MessageEnvelope {
  success: boolean
  message: RawSentMessage
}

export type OutgoingMessageMetadata =
  | { type: 'game_invite'; place_id: string; job_id: string | null }
  | { type: 'vip_server_invite'; server_id: number }

export const messagesApi = {
  listConversations: (token: string) => request<ConversationsResponse>(token, '/v2/conversations'),

  unreadCount: (token: string) => request<{ unread: number }>(token, '/v2/conversations/unread-count'),

  getConversation: (token: string, recipientId: string, page = 1) =>
    request<ConversationPage>(token, `/v2/conversations/${recipientId}/messages?page=${page}`),

  sendMessage: async (
    token: string,
    recipientId: string,
    content: string,
    parentId: string | null = null,
    metadata?: OutgoingMessageMetadata
  ): Promise<RawSentMessage> => {
    const res = await request<MessageEnvelope>(token, `/v2/conversations/${recipientId}/messages`, {
      method: 'POST',
      body: { content, parent_id: parentId, ...(metadata ? { metadata } : {}) }
    })
    return res.message
  },

  editMessage: async (
    token: string,
    recipientId: string,
    messageId: string,
    content: string,
    parentId: string | null = null
  ): Promise<RawSentMessage> => {
    const res = await request<MessageEnvelope>(token, `/v2/conversations/${recipientId}/messages/${messageId}`, {
      method: 'PATCH',
      body: { content, parent_id: parentId }
    })
    return res.message
  },

  deleteMessage: (token: string, recipientId: string, messageId: string) =>
    request<void>(token, `/v2/conversations/${recipientId}/messages/${messageId}`, { method: 'DELETE' }),

  reportMessage: (token: string, recipientId: string, messageId: string, reason: string) =>
    request<void>(token, `/v2/conversations/${recipientId}/messages/${messageId}/reports`, {
      method: 'POST',
      body: { reason }
    }),

  hideConversation: (token: string, recipientId: string) =>
    request<{ success: boolean }>(token, `/v2/conversations/${recipientId}/hidden`, { method: 'PUT' }),

  unhideConversation: (token: string, recipientId: string) =>
    request<{ success: boolean }>(token, `/v2/conversations/${recipientId}/hidden`, { method: 'DELETE' }),

  blockUser: (token: string, recipientId: string) =>
    request<{ success: boolean }>(token, `/v2/users/me/blocked-users/${recipientId}`, { method: 'PUT' }),

  unblockUser: (token: string, recipientId: string) =>
    request<{ success: boolean }>(token, `/v2/users/me/blocked-users/${recipientId}`, { method: 'DELETE' }),

  listBlockedUsers: async (token: string): Promise<string[]> => {
    const res = await request<{ blocked_users?: { blocked_user_id?: string }[] }>(
      token,
      '/v2/users/me/blocked-users'
    )
    return (res.blocked_users ?? [])
      .map((entry) => entry.blocked_user_id)
      .filter((id): id is string => typeof id === 'string')
  }
}
