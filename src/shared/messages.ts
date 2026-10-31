export interface MessageItem {
  id: string
  parent_id: string | null
  sender_id: string
  receiver_id: string
  content: string
  metadata: Record<string, unknown> | null
  created_at: number
  updated_at?: number
  read_at: number | null
  reactions?: Record<string, string[]>
}

export interface ConversationSummary {
  message: MessageItem
  recipient_id: string
  message_count: number
  unread_count: number
}

export interface ConversationsResponse {
  conversations: ConversationSummary[]
  total_conversations: number
}

export interface ConversationPage {
  items: MessageItem[]
  total: number
  page: number
  total_pages: number
  size: number
}

export interface GroupChat {
  id: string
  name: string
  owner_id: string
  created_at: number
  member_ids: string[]
}

export interface GroupChatSummary extends GroupChat {
  unread_count: number
  message: MessageItem | null
}

export interface GroupInvite {
  code: string
  expires_in: number
}

export interface GroupInvitePreview {
  id: string
  name: string
  owner_id: string
  member_ids: string[]
  member_count: number
  max_members: number
  is_member: boolean
}

export interface GroupChatsResponse {
  groups: GroupChatSummary[]
  total_groups: number
}
