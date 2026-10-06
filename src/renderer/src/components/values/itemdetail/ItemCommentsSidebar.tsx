import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { commentsApi } from '@renderer/lib/commentsApi'
import { CommentCard } from '@renderer/components/values/itemdetail/CommentCard'
import { FilterMenu } from '@renderer/components/tracker/FilterMenus'
import type { Comment, CommentsPage, CommentSort } from '@shared/comment'
import type { Item } from '@shared/item'

const SORT_OPTIONS: readonly { value: CommentSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'activity', label: 'Recent Activity' }
]

export function ItemCommentsSidebar({ item }: { item: Item }): React.JSX.Element {
  const { token } = useAuth()
  const { user: currentUser } = useCurrentUser()
  const [sort, setSort] = useState<CommentSort>('newest')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<CommentsPage | null>(null)
  const [error, setError] = useState(false)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [item.id, sort])

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(false)
    commentsApi
      .list(item.id, item.type, page, sort)
      .then((result) => !cancelled && setData(result))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [item.id, item.type, page, sort])

  const updateComment = (id: number, updated: Comment | null, isReply: boolean, parentId?: number): void => {
    setData((prev) => {
      if (!prev) return prev
      if (!isReply) {
        return { ...prev, items: updated ? prev.items.map((c) => (c.id === id ? updated : c)) : prev.items.filter((c) => c.id !== id) }
      }
      return {
        ...prev,
        items: prev.items.map((c) =>
          c.id === parentId
            ? {
                ...c,
                replies: updated
                  ? (c.replies ?? []).map((r) => (r.id === id ? updated : r))
                  : (c.replies ?? []).filter((r) => r.id !== id)
              }
            : c
        )
      }
    })
  }

  const addReply = (parentId: number, reply: Comment): void => {
    setData((prev) => (prev ? { ...prev, items: prev.items.map((c) => (c.id === parentId ? { ...c, replies: [...(c.replies ?? []), reply] } : c)) } : prev))
  }

  const handlePost = async (): Promise<void> => {
    const content = draft.trim()
    if (!content || !token || !currentUser) return
    setPosting(true)
    try {
      const result = await commentsApi.post(token, item.id, item.type, content)
      const newComment: Comment = {
        id: result.id,
        content,
        date: Math.floor(Date.now() / 1000),
        item_id: item.id,
        item_type: item.type,
        edited_at: null,
        parent_id: null,
        reply_to_id: null,
        user: { id: currentUser.id, username: currentUser.username, global_name: currentUser.name, avatar: currentUser.avatar },
        reactions: {},
        replies: []
      }
      setData((prev) => (prev ? { ...prev, items: [newComment, ...prev.items], total: prev.total + 1 } : prev))
      setDraft('')
    } catch {
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 py-2.5">
        <h1 className="text-xs font-bold uppercase tracking-wide text-quaternary-text">
          Comments {data ? `(${data.total})` : ''}
        </h1>
      </div>

      <div className="px-3 pb-2">
        <FilterMenu<CommentSort> label="Sort" value={sort} options={SORT_OPTIONS} onChange={setSort} />
      </div>

      <div className="px-3 pb-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="w-full resize-none rounded-md border border-border-card bg-tertiary-bg px-2.5 py-1.5 text-sm text-primary-text placeholder-secondary-text focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void handlePost()}
          disabled={posting || !draft.trim()}
          className="mt-1.5 w-full rounded-md bg-button-info px-3 py-1.5 text-xs font-semibold text-form-button-text transition-colors hover:bg-button-info-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Post Comment
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {error ? (
          <p className="py-8 text-center text-xs text-status-error">Failed to load comments.</p>
        ) : !data ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
          </div>
        ) : data.items.length === 0 ? (
          <p className="py-8 text-center text-xs text-quaternary-text">No comments yet - be the first.</p>
        ) : (
          <div className="space-y-3">
            {data.items.map((comment) => (
              <div key={comment.id}>
                <CommentCard
                  comment={comment}
                  onChanged={(updated) => updateComment(comment.id, updated, false)}
                  onReplyPosted={(reply) => addReply(comment.id, reply)}
                />
                {comment.replies?.map((reply) => (
                  <CommentCard
                    key={reply.id}
                    comment={reply}
                    isReply
                    onChanged={(updated) => updateComment(reply.id, updated, true, comment.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {data && data.total_pages > 1 && (
        <div className="flex shrink-0 items-center justify-between border-t border-border-primary px-3 py-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-xs font-semibold text-link hover:text-link-hover disabled:pointer-events-none disabled:text-tertiary-text"
          >
            Prev
          </button>
          <span className="text-[11px] text-quaternary-text">
            {page}/{data.total_pages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            disabled={page >= data.total_pages}
            className="text-xs font-semibold text-link hover:text-link-hover disabled:pointer-events-none disabled:text-tertiary-text"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
