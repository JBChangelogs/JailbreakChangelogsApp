import type { CommentsPage, CommentSort } from '@shared/comment'

const API_BASE = 'https://api.jailbreakchangelogs.com'

async function request<T>(path: string, init?: { method?: string; token?: string | null; body?: unknown }): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      ...(init?.token ? { Authorization: init.token } : {}),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {})
    },
    body: init?.body ? JSON.stringify(init.body) : undefined
  })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export const commentsApi = {
  list: (itemId: number, itemType: string, page: number, sort: CommentSort) =>
    request<CommentsPage>(`/v2/comments?item_type=${encodeURIComponent(itemType)}&item_id=${itemId}&page=${page}&sort=${sort}`),

  post: (token: string, itemId: number, itemType: string, content: string, parentId: number | null = null) =>
    request<{ id: number }>('/v2/comments', {
      method: 'POST',
      token,
      body: { content, item_id: itemId, item_type: itemType, parent_id: parentId }
    }),

  edit: (token: string, commentId: number, content: string) =>
    request<void>(`/v2/comments/${commentId}`, { method: 'PATCH', token, body: { content } }),

  remove: (token: string, commentId: number) => request<void>(`/v2/comments/${commentId}`, { method: 'DELETE', token }),

  react: (token: string, commentId: number, emoji: string) =>
    request<void>(`/v2/comments/${commentId}/reactions?emoji=${encodeURIComponent(emoji)}`, { method: 'POST', token }),

  report: (token: string, commentId: number, reason: string) =>
    request<void>(`/v2/comments/${commentId}/reports`, { method: 'POST', token, body: { reason } })
}
