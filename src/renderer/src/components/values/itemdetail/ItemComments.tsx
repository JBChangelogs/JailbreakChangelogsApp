import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
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

export function ItemComments({ item }: { item: Item }): React.JSX.Element {
  const { token } = useAuth()
  const { user: currentUser } = useCurrentUser()
  const [sort, setSort] = useState<CommentSort>('newest')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<CommentsPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  const changeSort = (next: CommentSort): void => {
    setSort(next)
    setPage(1)
    setData(null)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    commentsApi
      .list(item.id, item.type, page, sort)
      .then((result) => {
        if (cancelled) return
        setData((prev) => (page === 1 || !prev ? result : { ...result, items: [...prev.items, ...result.items] }))
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false))
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
    <section className="space-y-3 border-t border-border-primary pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-primary-text">
          Comments
          {data && <span className="ml-2 text-sm font-normal text-secondary-text">{data.total.toLocaleString()}</span>}
        </h3>
        <div className="w-48">
          <FilterMenu<CommentSort> label="Sort" value={sort} options={SORT_OPTIONS} onChange={changeSort} />
        </div>
      </div>

      <div className="rounded-xl border border-border-card bg-secondary-bg p-2 transition-colors focus-within:border-button-info">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={token ? 'Add a comment...' : 'Log in to comment'}
          disabled={!token}
          rows={2}
          className="w-full resize-none bg-transparent px-1.5 py-1 text-sm text-primary-text placeholder-secondary-text focus:outline-none disabled:cursor-not-allowed"
        />
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={() => void handlePost()} disabled={posting || !draft.trim()}>
            Post
          </Button>
        </div>
      </div>

      {error && !data ? (
        <p className="py-6 text-center text-sm text-status-error">Failed to load comments.</p>
      ) : !data ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
        </div>
      ) : data.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-quaternary-text">No comments yet - be the first.</p>
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

      {data && page < data.total_pages && (
        <div className="flex justify-center">
          <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={() => setPage((p) => p + 1)}>
            {loading ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </section>
  )
}
