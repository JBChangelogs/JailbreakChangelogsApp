import type {
  ConversationsResponse,
  ConversationPage,
  GroupChat,
  GroupChatsResponse,
  GroupInvite,
  GroupInvitePreview
} from '@shared/messages'

export type {
  MessageItem,
  ConversationSummary,
  ConversationPage,
  GroupChat,
  GroupChatSummary
} from '@shared/messages'

export interface ChatTarget {
  kind: 'dm' | 'group'
  id: string
}

const GROUP_KEY_PREFIX = 'group:'

// Selection key for a chat: a DM is the bare recipient id (so existing stored
// selections and "message this user" links keep working), a group is prefixed.
export function chatKey(target: ChatTarget): string {
  return target.kind === 'group' ? `${GROUP_KEY_PREFIX}${target.id}` : target.id
}

export function parseChatKey(key: string | null): ChatTarget | null {
  if (!key) return null
  return key.startsWith(GROUP_KEY_PREFIX)
    ? { kind: 'group', id: key.slice(GROUP_KEY_PREFIX.length) }
    : { kind: 'dm', id: key }
}

export function chatPath(target: ChatTarget): string {
  return target.kind === 'group' ? `/v2/group-chats/${target.id}` : `/v2/conversations/${target.id}`
}

const API_BASE = 'https://api.jailbreakchangelogs.com'

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null
  ) {
    super(message)
  }
}

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
    let code: string | null = null
    try {
      const data = await res.json()
      if (typeof data?.message === 'string') message = data.message
      const rawCode = data?.code ?? data?.error ?? data?.detail
      if (typeof rawCode === 'string') code = rawCode
    } catch {
    }
    throw new ApiRequestError(message, res.status, code)
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

  getConversation: (token: string, path: string, page = 1) =>
    request<ConversationPage>(token, `${path}/messages?page=${page}`),

  sendMessage: async (
    token: string,
    path: string,
    content: string,
    parentId: string | null = null,
    metadata?: OutgoingMessageMetadata
  ): Promise<RawSentMessage> => {
    const res = await request<MessageEnvelope>(token, `${path}/messages`, {
      method: 'POST',
      body: { content, parent_id: parentId, ...(metadata ? { metadata } : {}) }
    })
    return res.message
  },

  editMessage: async (
    token: string,
    path: string,
    messageId: string,
    content: string,
    parentId: string | null = null
  ): Promise<RawSentMessage> => {
    const res = await request<MessageEnvelope>(token, `${path}/messages/${messageId}`, {
      method: 'PATCH',
      body: { content, parent_id: parentId }
    })
    return res.message
  },

  deleteMessage: (token: string, path: string, messageId: string) =>
    request<void>(token, `${path}/messages/${messageId}`, { method: 'DELETE' }),

  toggleReaction: (token: string, path: string, messageId: string, emoji: string) =>
    request<{ reactions: Record<string, string[]> }>(
      token,
      `${path}/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`,
      { method: 'POST' }
    ),

  reportMessage: (token: string, path: string, messageId: string, reason: string) =>
    request<void>(token, `${path}/messages/${messageId}/reports`, {
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

export const groupChatsApi = {
  list: (token: string) => request<GroupChatsResponse>(token, '/v2/group-chats'),

  create: (token: string, name: string, memberIds: string[]) =>
    request<GroupChat>(token, '/v2/group-chats', { method: 'POST', body: { name, member_ids: memberIds } }),

  rename: (token: string, groupId: string, name: string) =>
    request<GroupChat>(token, `/v2/group-chats/${groupId}`, { method: 'PATCH', body: { name } }),

  remove: (token: string, groupId: string) =>
    request<void>(token, `/v2/group-chats/${groupId}`, { method: 'DELETE' }),

  addMembers: (token: string, groupId: string, memberIds: string[]) =>
    request<GroupChat>(token, `/v2/group-chats/${groupId}/members`, {
      method: 'POST',
      body: { member_ids: memberIds }
    }),

  // Generated collage of member avatars. It needs the auth header, so it's
  // fetched as bytes instead of used as an <img> src.
  fetchIcon: async (token: string, groupId: string, version: string): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/v2/group-chats/${groupId}/icon?v=${version}`, {
      headers: { Authorization: token }
    })
    if (!res.ok) throw new Error(`Request failed (${res.status})`)
    return res.blob()
  },

  // Pass your own id to leave.
  removeMember: (token: string, groupId: string, userId: string) =>
    request<GroupChat>(token, `/v2/group-chats/${groupId}/members/${userId}`, { method: 'DELETE' }),

  createInvite: (token: string, groupId: string) =>
    request<GroupInvite>(token, `/v2/group-chats/${groupId}/invite`, { method: 'POST' }),

  revokeInvite: (token: string, groupId: string) =>
    request<void>(token, `/v2/group-chats/${groupId}/invite`, { method: 'DELETE' }),

  previewInvite: (token: string, code: string) =>
    request<GroupInvitePreview>(token, `/v2/group-chats/invites/${encodeURIComponent(code)}`),

  joinInvite: (token: string, code: string) =>
    request<GroupChat>(token, `/v2/group-chats/invites/${encodeURIComponent(code)}`, { method: 'POST' })
}
