import { useState } from 'react'
import { resolveAvatarUrl } from '@renderer/lib/usersApi'
import { formatFullValue } from '@renderer/lib/itemValueUtils'
import { useRelativeTime } from '@renderer/hooks/useRelativeTime'
import type { SuggestionUser, ValueSuggestion } from '@shared/itemDetail'

function ArrowUpIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0-6 6m6-6 6 6" />
    </svg>
  )
}

function ArrowDownIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0 6-6m-6 6-6-6" />
    </svg>
  )
}

function ExternalLinkIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 5h5v5m0-5-7 7M9 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3"
      />
    </svg>
  )
}

function XIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

const STATUS_STYLES: Record<string, string> = {
  accepted: 'bg-status-success/20 text-status-success',
  pending: 'bg-status-warning/20 text-status-warning',
  rejected: 'bg-status-error/20 text-status-error'
}

function suggestionUserLabel(user: SuggestionUser): string {
  return user.global_name || user.username
}

function SuggestionAvatar({ user, className = 'h-9 w-9' }: { user: SuggestionUser; className?: string }): React.JSX.Element {
  const src = resolveAvatarUrl(user.id, user.avatar)
  const label = suggestionUserLabel(user)
  if (!src) {
    return (
      <div className={`${className} flex shrink-0 items-center justify-center rounded-full bg-tertiary-bg text-xs font-semibold text-secondary-text`}>
        {label.slice(0, 2).toUpperCase()}
      </div>
    )
  }
  return <img src={src} alt="" draggable={false} className={`${className} shrink-0 rounded-full object-cover`} />
}

function VoterRow({ createdAt, user }: { createdAt: number; user: SuggestionUser }): React.JSX.Element {
  const relativeTime = useRelativeTime(createdAt)
  return (
    <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-quaternary-bg">
      <SuggestionAvatar user={user} className="h-7 w-7" />
      <p className="min-w-0 flex-1 truncate text-sm text-primary-text">{suggestionUserLabel(user)}</p>
      <p className="shrink-0 text-xs text-tertiary-text">{relativeTime ?? 'just now'}</p>
    </div>
  )
}

function VotersModal({ suggestion, onClose }: { suggestion: ValueSuggestion; onClose: () => void }): React.JSX.Element {
  const [tab, setTab] = useState<'upvotes' | 'downvotes'>('upvotes')
  const voters = tab === 'upvotes' ? suggestion.votes.upvotes : suggestion.votes.downvotes

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[70vh] w-full max-w-sm flex-col overflow-hidden rounded-xl border border-border-card bg-primary-bg shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border-primary px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-text">Votes</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex border-b border-border-primary">
          <button
            type="button"
            onClick={() => setTab('upvotes')}
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              tab === 'upvotes' ? 'border-b-2 border-status-success text-primary-text' : 'text-tertiary-text hover:text-secondary-text'
            }`}
          >
            Upvotes ({suggestion.votes.upvotes.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('downvotes')}
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              tab === 'downvotes' ? 'border-b-2 border-status-error text-primary-text' : 'text-tertiary-text hover:text-secondary-text'
            }`}
          >
            Downvotes ({suggestion.votes.downvotes.length})
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {voters.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-quaternary-text">No {tab} yet.</p>
          ) : (
            voters.map((vote, index) => <VoterRow key={`${vote.user.id}-${index}`} createdAt={vote.created_at} user={vote.user} />)
          )}
        </div>
      </div>
    </div>
  )
}

export function SuggestionRow({
  suggestion,
  showVoteLink = true
}: {
  suggestion: ValueSuggestion
  showVoteLink?: boolean
}): React.JSX.Element {
  const relativeTime = useRelativeTime(suggestion.created_at)
  const [showVoters, setShowVoters] = useState(false)
  const [reasonExpanded, setReasonExpanded] = useState(false)

  const reason = suggestion.reason ?? ''
  const reasonIsLong = reason.length > 240
  const websiteUrl = `https://jailbreakchangelogs.com/item/${encodeURIComponent(suggestion.item.type)}/${encodeURIComponent(suggestion.item.name)}?tab=suggestions`

  return (
    <div className="rounded-2xl border border-border-card bg-secondary-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <SuggestionAvatar user={suggestion.user} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-primary-text">{suggestionUserLabel(suggestion.user)}</p>
            <p className="text-xs text-secondary-text">{relativeTime ?? 'just now'}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
            STATUS_STYLES[suggestion.status] ?? 'bg-quaternary-bg text-secondary-text'
          }`}
        >
          {suggestion.status}
        </span>
      </div>

      <p className="mt-3 text-sm text-primary-text">
        Suggested <span className="font-semibold capitalize">{suggestion.field.replace(/_/g, ' ')}</span>:{' '}
        <span className="font-mono text-secondary-text">{formatFullValue(suggestion.current_value)}</span>
        {' -> '}
        <span className="font-mono font-semibold">{formatFullValue(suggestion.suggested_value)}</span>
      </p>

      {reason && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-secondary-text">
          {reasonIsLong && !reasonExpanded ? `${reason.slice(0, 240)}...` : reason}
          {reasonIsLong && (
            <button
              type="button"
              onClick={() => setReasonExpanded((v) => !v)}
              className="ml-1 font-medium text-button-info hover:underline"
            >
              {reasonExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </p>
      )}

      {suggestion.status === 'rejected' && suggestion.rejection_reason && (
        <p className="mt-2 rounded-md border border-status-error/30 bg-status-error/10 px-2.5 py-1.5 text-xs text-status-error">
          Rejected: {suggestion.rejection_reason}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowVoters(true)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-status-success transition-colors hover:bg-quaternary-bg"
        >
          <ArrowUpIcon className="h-3.5 w-3.5" />
          {suggestion.upvotes}
        </button>
        <button
          type="button"
          onClick={() => setShowVoters(true)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-status-error transition-colors hover:bg-quaternary-bg"
        >
          <ArrowDownIcon className="h-3.5 w-3.5" />
          {suggestion.downvotes}
        </button>
        {showVoteLink && suggestion.status === 'pending' && (
          <a
            href={websiteUrl}
            onClick={(e) => {
              e.preventDefault()
              void window.api.openExternal(websiteUrl)
            }}
            className="ml-auto flex items-center gap-1 text-xs font-semibold text-link hover:text-link-hover"
          >
            Vote on website
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {showVoters && <VotersModal suggestion={suggestion} onClose={() => setShowVoters(false)} />}
    </div>
  )
}
