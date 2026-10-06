export interface CommentUser {
  id: string
  username: string | null
  global_name: string | null
  avatar: string | null
}

export interface Comment {
  id: number
  content: string
  date: number
  item_id: number
  item_type: string
  edited_at: number | null
  parent_id: number | null
  reply_to_id: number | null
  user: CommentUser
  reactions: Record<string, CommentUser[]>
  replies?: Comment[]
}

export interface CommentsPage {
  items: Comment[]
  total: number
  page: number
  total_pages: number
  size: number
}

export type CommentSort = 'newest' | 'oldest' | 'activity'
