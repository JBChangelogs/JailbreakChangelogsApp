import { useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { useRelativeTime } from '@renderer/hooks/useRelativeTime'
import { commentsApi } from '@renderer/lib/commentsApi'
import { resolveAvatarUrl } from '@renderer/lib/usersApi'
import type { Comment, CommentUser } from '@shared/comment'

function commentUserLabel(user: CommentUser): string {
  return user.global_name || user.username || 'Unknown user'
}

function CommentAvatar({ user }: { user: CommentUser }): React.JSX.Element {
  const src = resolveAvatarUrl(user.id, user.avatar)
  const label = commentUserLabel(user)
  if (!src) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tertiary-bg text-xs font-semibold text-secondary-text">
        {label.slice(0, 2).toUpperCase()}
      </div>
    )
  }
  return <img src={src} alt="" draggable={false} className="h-8 w-8 shrink-0 rounded-full object-cover" />
}

export function CommentCard({
  comment,
  onReplyPosted,
  onChanged,
  isReply = false
}: {
  comment: Comment
  onReplyPosted?: (reply: Comment) => void
  onChanged: (updated: Comment | null) => void
  isReply?: boolean
}): React.JSX.Element {
  const { token } = useAuth()
  const { user: currentUser } = useCurrentUser()
  const relativeTime = useRelativeTime(comment.date)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  const [busy, setBusy] = useState(false)

  const isOwn = currentUser?.id === comment.user.id
  const isEdited = comment.edited_at != null

  const submitReply = async (): Promise<void> => {
    const content = replyText.trim()
    if (!content || !token) return
    setBusy(true)
    try {
      const result = await commentsApi.post(token, comment.item_id, comment.item_type, content, comment.id)
      onReplyPosted?.({
        id: result.id,
        content,
        date: Math.floor(Date.now() / 1000),
        item_id: comment.item_id,
        item_type: comment.item_type,
        edited_at: null,
        parent_id: comment.parent_id ?? comment.id,
        reply_to_id: comment.id,
        user: {
          id: currentUser!.id,
          username: currentUser!.username,
          global_name: currentUser!.name,
          avatar: currentUser!.avatar
        },
        reactions: {}
      })
      setReplyText('')
      setReplying(false)
    } catch {
    } finally {
      setBusy(false)
    }
  }

  const submitEdit = async (): Promise<void> => {
    const content = editText.trim()
    if (!content || !token) return
    setBusy(true)
    try {
      await commentsApi.edit(token, comment.id, content)
      onChanged({ ...comment, content, edited_at: Math.floor(Date.now() / 1000) })
      setEditing(false)
    } catch {
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!token) return
    if (!window.confirm('Delete this comment? This cannot be undone.')) return
    setBusy(true)
    try {
      await commentsApi.remove(token, comment.id)
      onChanged(null)
    } catch {
      setBusy(false)
    }
  }

  const handleReact = async (emoji: string): Promise<void> => {
    if (!token || !currentUser) return
    const existing = comment.reactions[emoji] ?? []
    const alreadyReacted = existing.some((u) => u.id === currentUser.id)
    const nextReactions = { ...comment.reactions }
    if (alreadyReacted) {
      nextReactions[emoji] = existing.filter((u) => u.id !== currentUser.id)
      if (nextReactions[emoji].length === 0) delete nextReactions[emoji]
    } else {
      nextReactions[emoji] = [
        ...existing,
        { id: currentUser.id, username: currentUser.username, global_name: currentUser.name, avatar: currentUser.avatar }
      ]
    }
    onChanged({ ...comment, reactions: nextReactions })
    try {
      await commentsApi.react(token, comment.id, emoji)
    } catch {
      onChanged(comment)
    }
  }

  const handleReport = async (): Promise<void> => {
    if (!token) return
    const reason = window.prompt('Reason for reporting this comment:')
    if (!reason || !reason.trim()) return
    try {
      await commentsApi.report(token, comment.id, reason.trim())
      window.alert('Comment reported.')
    } catch {
      window.alert('Failed to report comment.')
    }
  }

  return (
    <div className={isReply ? 'ml-5 mt-2' : ''}>
      <div className="flex items-start gap-2.5">
        <CommentAvatar user={comment.user} />
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-tertiary-bg px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-primary-text">{commentUserLabel(comment.user)}</span>
              <span className="text-[11px] text-tertiary-text">
                {relativeTime ?? 'just now'}
                {isEdited && ' (edited)'}
              </span>
            </div>
            {editing ? (
              <div className="mt-1.5 space-y-1.5">
                <textarea
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-border-card bg-secondary-bg px-2 py-1.5 text-sm text-primary-text focus:outline-none"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => void submitEdit()} disabled={busy} className="text-xs font-semibold text-link hover:text-link-hover">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false)
                      setEditText(comment.content)
                    }}
                    className="text-xs font-semibold text-secondary-text hover:text-primary-text"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-primary-text">{comment.content}</p>
            )}
          </div>

          {Object.keys(comment.reactions).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(comment.reactions).map(([emoji, users]) =>
                users.length > 0 ? (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => void handleReact(emoji)}
                    className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors ${
                      currentUser && users.some((u) => u.id === currentUser.id)
                        ? 'border-button-info/40 bg-button-info/20'
                        : 'border-border-card bg-tertiary-bg hover:bg-quaternary-bg'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="text-secondary-text">{users.length}</span>
                  </button>
                ) : null
              )}
            </div>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-3">
            {!isReply && (
              <button type="button" onClick={() => setReplying((v) => !v)} className="text-xs font-semibold text-secondary-text hover:text-primary-text">
                Reply
              </button>
            )}
            {isOwn && !editing && (
              <>
                <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-secondary-text hover:text-primary-text">
                  Edit
                </button>
                <button type="button" onClick={() => void handleDelete()} className="text-xs font-semibold text-secondary-text hover:text-status-error">
                  Delete
                </button>
              </>
            )}
            {!isOwn && (
              <button type="button" onClick={() => void handleReport()} className="text-xs font-semibold text-secondary-text hover:text-status-error">
                Report
              </button>
            )}
          </div>

          {replying && (
            <div className="mt-2 space-y-1.5">
              <textarea
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${commentUserLabel(comment.user)}...`}
                rows={2}
                className="w-full resize-none rounded-xl border border-border-card bg-tertiary-bg px-2 py-1.5 text-sm text-primary-text placeholder-secondary-text focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void submitReply()}
                  disabled={busy || !replyText.trim()}
                  className="text-xs font-semibold text-link hover:text-link-hover disabled:opacity-50"
                >
                  Post Reply
                </button>
                <button type="button" onClick={() => setReplying(false)} className="text-xs font-semibold text-secondary-text hover:text-primary-text">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
