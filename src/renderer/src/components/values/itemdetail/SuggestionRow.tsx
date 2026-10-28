import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Tabs } from '@renderer/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { resolveAvatarUrl } from '@renderer/lib/usersApi'
import { formatFullValue } from '@renderer/lib/itemValueUtils'
import { useRelativeTime } from '@renderer/hooks/useRelativeTime'
import type { SuggestionUser, ValueSuggestion } from '@shared/itemDetail'

const Markdown = lazy(() => import('@renderer/components/ui/markdown').then((m) => ({ default: m.Markdown })))

const VT_ICON = 'https://assets.jailbreakchangelogs.com/assets/website_icons/jbcl_vt.svg'

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
  pending: 'border-status-warning/30 bg-status-warning/20',
  approved: 'border-status-success/30 bg-status-success/20',
  accepted: 'border-status-success/30 bg-status-success/20',
  rejected: 'border-status-error/30 bg-status-error/20'
}

const BADGE = 'inline-flex h-6 items-center rounded-md border px-2.5 text-xs font-medium'

const REASON_CLAMP_PX = 72

function suggestionUserLabel(user: SuggestionUser): string {
  return user.roblox_display_name || user.roblox_username || user.global_name || user.username || `User #${user.id}`
}

function fieldLabel(field: string): string {
  return field
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatReason(reason: string): string {
  return reason
    .replace(/(Common Trades?:?)/gi, '**$1**')
    .split(/\n\n+/)
    .map((paragraph) => paragraph.replace(/\n/g, '\n\n'))
    .join('\n\n')
}

function formatFullDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })
}

function SuggestionAvatar({ user, className = 'h-7 w-7' }: { user: SuggestionUser; className?: string }): React.JSX.Element {
  const src = user.roblox_avatar || resolveAvatarUrl(user.id, user.avatar)
  const label = suggestionUserLabel(user)
  if (!src) {
    return (
      <div
        className={`${className} flex shrink-0 items-center justify-center rounded-full bg-tertiary-bg text-[10px] font-semibold text-secondary-text`}
      >
        {label.slice(0, 2).toUpperCase()}
      </div>
    )
  }
  return <img src={src} alt="" draggable={false} className={`${className} shrink-0 rounded-full bg-tertiary-bg object-cover`} />
}

function Reason({ reason }: { reason: string }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const observer = new ResizeObserver(() => setOverflows(el.scrollHeight > REASON_CLAMP_PX + 4))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div>
      <div
        ref={ref}
        className="overflow-hidden text-secondary-text [&_p]:my-0 [&_p+p]:mt-1.5 [&_strong]:font-semibold [&_strong]:text-primary-text"
        style={
          expanded || !overflows
            ? undefined
            : {
                maxHeight: REASON_CLAMP_PX,
                maskImage: 'linear-gradient(to bottom, black 60%, transparent)'
              }
        }
      >
        <Suspense fallback={<p className="text-sm">{reason}</p>}>
          <Markdown className="leading-relaxed">{formatReason(reason)}</Markdown>
        </Suspense>
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-link hover:text-link-hover"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}

function VoterRow({ createdAt, user }: { createdAt: number; user: SuggestionUser }): React.JSX.Element {
  const relativeTime = useRelativeTime(createdAt)
  return (
    <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-quaternary-bg">
      <SuggestionAvatar user={user} />
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
          <h2 className="text-sm font-semibold text-primary-text">Voters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="px-3 pt-2">
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'upvotes', label: `Upvotes (${suggestion.votes.upvotes.length})` },
              { value: 'downvotes', label: `Downvotes (${suggestion.votes.downvotes.length})` }
            ]}
          />
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
  kind
}: {
  suggestion: ValueSuggestion
  kind: 'change' | 'suggestion'
}): React.JSX.Element {
  const isSuggestion = kind === 'suggestion'
  const relativeTime = useRelativeTime(suggestion.created_at)
  const [showVoters, setShowVoters] = useState(false)
  const websiteUrl = `https://jailbreakchangelogs.com/items/suggestions/${suggestion.id}`
  const updated = isSuggestion && suggestion.updated_at !== suggestion.created_at

  return (
    <div className="rounded-xl border border-border-card bg-secondary-bg p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-sm font-bold text-primary-text">#{suggestion.id}</span>
        <span className={`${BADGE} border-border-card bg-tertiary-bg text-primary-text`}>{fieldLabel(suggestion.field)}</span>
        {isSuggestion && (
          <span
            className={`${BADGE} capitalize ${
              STATUS_STYLES[suggestion.status]
                ? `${STATUS_STYLES[suggestion.status]} text-primary-text`
                : 'border-border-card bg-tertiary-bg/40 text-secondary-text'
            }`}
          >
            {suggestion.status}
          </span>
        )}
        {isSuggestion && suggestion.is_vt === 1 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <img src={VT_ICON} alt="Value Team" className="h-5 w-5" draggable={false} />
            </TooltipTrigger>
            <TooltipContent>Value Team Suggestion</TooltipContent>
          </Tooltip>
        )}
        <button
          type="button"
          onClick={() => setShowVoters(true)}
          aria-label="View voters"
          className="ml-auto flex items-center overflow-hidden rounded-md border border-border-card text-xs font-semibold transition-colors hover:border-border-focus/60"
        >
          <span className="flex items-center gap-1 bg-button-success/10 px-2 py-1 text-button-success">
            <ArrowUpIcon className="h-3.5 w-3.5" />
            {suggestion.upvotes}
          </span>
          <span className="flex items-center gap-1 border-l border-border-card bg-button-danger/10 px-2 py-1 text-button-danger">
            <ArrowDownIcon className="h-3.5 w-3.5" />
            {suggestion.downvotes}
          </span>
        </button>
      </div>

      <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-base font-bold [overflow-wrap:anywhere]">
        <span className="text-secondary-text line-through decoration-button-danger/70">
          {formatFullValue(suggestion.current_value) || 'N/A'}
        </span>
        <span className="text-sm text-tertiary-text">→</span>
        <span className="text-primary-text">{formatFullValue(suggestion.suggested_value)}</span>
      </p>

      {suggestion.reason && (
        <div className="mt-2">
          <Reason reason={suggestion.reason} />
        </div>
      )}

      {suggestion.status === 'rejected' && suggestion.rejection_reason && (
        <p className="mt-2 rounded-md border border-status-error/30 bg-status-error/10 px-2.5 py-1.5 text-xs text-primary-text">
          Rejected: {suggestion.rejection_reason}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-border-card pt-3">
        <SuggestionAvatar user={suggestion.user} />
        <p className="min-w-0 truncate text-sm font-medium text-primary-text">{suggestionUserLabel(suggestion.user)}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0 cursor-help text-xs text-tertiary-text">
              {relativeTime ?? 'just now'}
              {updated ? ' (Updated)' : ''}
            </span>
          </TooltipTrigger>
          <TooltipContent>{formatFullDate(suggestion.created_at)}</TooltipContent>
        </Tooltip>
        {isSuggestion && suggestion.status === 'pending' && (
          <a
            href={websiteUrl}
            onClick={(e) => {
              e.preventDefault()
              void window.api.openExternal(websiteUrl)
            }}
            className="ml-auto flex shrink-0 items-center gap-1 text-xs font-semibold text-link hover:text-link-hover"
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
