// Ported from the website's Dupes/DupeItemCard: title and category, the image with its badges,
// the original owner, and Dupe check / Compare histories / History.

import { useState } from 'react'
import { RobloxAvatar } from '@renderer/components/dupefinder/RobloxAvatar'
import { getItemImagePath, handleImageError } from '@renderer/lib/itemValueUtils'
import { CategoryIconBadge, getCategoryColor, getCategoryIcon } from '@renderer/lib/categoryIcons'
import { dupesApi, type DupeCheckResult } from '@renderer/lib/dupesApi'
import { Button } from '@renderer/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import type { DupeFinderItem } from '@shared/dupe'
import type { Item } from '@shared/item'

const toMs = (timestamp: number): number => (timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp)

const formatDate = (timestamp: number): string =>
  new Date(toMs(timestamp)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

const formatDateTime = (timestamp: number): string =>
  new Date(toMs(timestamp)).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

function UnlockBadges({ season, level }: { season: number | null; level: string | null }): React.JSX.Element | null {
  if (season == null && !level) return null
  const isPercent = !!level && level.includes('%')
  const levelLabel = level ? (isPercent ? `Top ${level}` : `Level ${level}`) : ''
  const tooltip =
    season != null && level
      ? `Unlocked in Season ${season} at ${levelLabel}.`
      : season != null
        ? `Unlocked in Season ${season}.`
        : `Unlocked at ${levelLabel}.`
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="absolute right-2 bottom-2 z-10 flex cursor-help items-center gap-1">
          {season != null && (
            <span className="inline-flex h-6 items-center rounded-md bg-button-info px-2 text-xs leading-none font-bold text-form-button-text">
              S{season}
            </span>
          )}
          {level && (
            <span className="inline-flex h-6 items-center rounded-md bg-status-success px-2 text-xs leading-none font-bold text-form-button-text">
              {isPercent ? level : `L${level}`}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

function DupeCheckDialog({
  open,
  onOpenChange,
  title,
  ownerName,
  checking,
  result,
  error,
  onRetry,
  onCompare
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  ownerName: string
  checking: boolean
  result: DupeCheckResult | null
  error: string | null
  onRetry: () => void
  onCompare: () => void
}): React.JSX.Element {
  const details = result
    ? [
        { label: 'History change', description: 'Whether the history difference exceeds 30%.', flagged: result.ratio > 0.3 },
        { label: 'Pattern analysis', description: 'Trading patterns associated with duplicated items.', flagged: result.check },
        { label: 'Dupe threshold', description: 'Whether this check flags the item as duplicated.', flagged: result.is_duped }
      ]
    : []

  const logged = (label: string, timestamp: number): React.JSX.Element => (
    <div className="px-3 py-2">
      <dt className="mb-1 text-sm text-secondary-text">{label}</dt>
      <dd className="text-sm text-primary-text">{timestamp > 0 ? formatDateTime(timestamp) : 'Not available'}</dd>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dupe check: {title}</DialogTitle>
          <p className="mt-1 text-sm text-secondary-text">
            Original owner: <span className="font-medium text-primary-text">{ownerName}</span>
          </p>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-5 py-4" aria-live="polite" aria-busy={checking}>
          {checking ? (
            <div className="flex items-center gap-3 py-6 text-sm text-secondary-text">
              <div className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
              Checking the recorded ownership history…
            </div>
          ) : error ? (
            <p className="rounded-lg border border-status-error/30 bg-status-error/10 p-3 text-sm text-status-error" role="alert">
              {error}
            </p>
          ) : result ? (
            <div className="space-y-3">
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${result.is_duped ? 'border-status-error/30 bg-status-error/10' : 'border-border-card bg-tertiary-bg'}`}
              >
                <p className={`text-sm font-semibold ${result.is_duped ? 'text-status-error' : 'text-primary-text'}`}>
                  {result.is_duped ? 'Flagged as duped' : 'Not flagged by this check'}
                </p>
                <p className="text-sm text-secondary-text">
                  History difference:{' '}
                  <span className="font-semibold text-primary-text tabular-nums">{(result.ratio * 100).toFixed(2)}%</span>
                </p>
              </div>
              <div className="rounded-lg border border-border-card bg-tertiary-bg p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-primary-text">Check details</h3>
                  <span className="rounded-md bg-button-info/10 px-2 py-1 text-sm font-medium text-primary-text tabular-nums">
                    Checks flagged: {details.filter((d) => d.flagged).length}/{details.length}
                  </span>
                </div>
                <ul className="divide-y divide-border-card">
                  {details.map((detail) => (
                    <li key={detail.label} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 shrink-0 rounded-full ${detail.flagged ? 'bg-status-error' : 'bg-secondary-text/50'}`}
                        />
                        <span className="min-w-0 flex-1 font-medium text-primary-text">{detail.label}</span>
                        <span className={`shrink-0 ${detail.flagged ? 'text-status-error' : 'text-secondary-text'}`}>
                          {detail.flagged ? 'Flagged' : 'Not flagged'}
                        </span>
                      </div>
                      <p className="mt-1 pl-4 text-sm text-secondary-text">{detail.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <dl className="grid grid-cols-2 divide-x divide-border-card rounded-lg border border-border-card">
                {logged('Dupe logged', result.dupe_logged_at)}
                {logged('Original logged', result.original_logged_at)}
              </dl>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border-primary p-5">
          {error && (
            <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )}
          {result && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onOpenChange(false)
                onCompare()
              }}
            >
              Compare histories
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DupeItemCard({
  item,
  itemData,
  ownerId,
  ownerName,
  duplicateNumber,
  onHistory,
  onCompare
}: {
  item: DupeFinderItem
  itemData: Item | undefined
  /** The original owner, as the website's card shows. */
  ownerId: string
  ownerName: string
  duplicateNumber?: number
  onHistory: () => void
  onCompare: () => void
}): React.JSX.Element {
  const [checkOpen, setCheckOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<DupeCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runCheck = async (): Promise<void> => {
    if (checking) return
    setCheckOpen(true)
    setChecking(true)
    setError(null)
    setResult(null)
    try {
      setResult(await dupesApi.checkDupe(ownerId, item.item_id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to check this dupe.')
    } finally {
      setChecking(false)
    }
  }

  const color = getCategoryColor(item.categoryTitle)
  const CategoryIcon = getCategoryIcon(item.categoryTitle)
  const season = itemData?.season ?? item.season
  const levelValue = itemData?.level ?? item.level
  const level = levelValue != null && levelValue !== '' ? String(levelValue) : null
  const isSeasonal = itemData?.is_seasonal === 1 || season != null
  const isLimited = itemData?.is_limited === 1

  return (
    <div className="relative flex flex-col rounded-xl border border-border-card bg-tertiary-bg p-3 text-primary-text">
      {duplicateNumber != null && (
        <div
          className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-button-info text-xs font-bold text-form-button-text"
          aria-label={`Duplicate item number ${duplicateNumber}`}
        >
          #{duplicateNumber}
        </div>
      )}

      <div className="mb-4 pr-10">
        <h2 className="mb-1 text-2xl leading-tight font-black tracking-wide break-words uppercase italic">{item.title}</h2>
        <span
          className="inline-flex h-6 items-center gap-1.5 rounded-md border px-2.5 text-xs leading-none font-medium text-primary-text"
          style={{ borderColor: color, backgroundColor: `${color}22` }}
        >
          {CategoryIcon && <CategoryIcon className="h-3 w-3" style={{ color }} />}
          {item.categoryTitle}
        </span>
      </div>

      <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-lg bg-secondary-bg">
        {(isLimited || isSeasonal) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-2 right-2 z-10">
                <CategoryIconBadge type={item.categoryTitle} isLimited={isLimited} isSeasonal={isSeasonal} className="h-4 w-4" />
              </div>
            </TooltipTrigger>
            <TooltipContent>{isSeasonal ? 'Seasonal item' : 'Limited item'}</TooltipContent>
          </Tooltip>
        )}
        <UnlockBadges season={season} level={level} />
        <img
          src={getItemImagePath(item.categoryTitle, item.title)}
          alt={item.title}
          onError={handleImageError}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <RobloxAvatar userId={ownerId} label={ownerName} className="h-8 w-8 border border-border-card" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-secondary-text uppercase">Original Owner</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => void window.api.openExternal(`https://www.roblox.com/users/${ownerId}/profile`)}
                  className="block max-w-full truncate text-left text-sm font-semibold text-link hover:text-link-hover hover:underline"
                >
                  {ownerName}
                </button>
              </TooltipTrigger>
              <TooltipContent>{ownerName}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <p className="text-xs text-secondary-text">Logged {formatDate(item.logged_at)}</p>
        <div className="mt-auto grid grid-cols-3 gap-2">
          {[
            { label: checking ? 'Checking…' : 'Dupe check', onClick: () => void runCheck(), primary: true },
            { label: 'Compare histories', onClick: onCompare, primary: false },
            { label: 'History', onClick: onHistory, primary: false }
          ].map((action) => (
            <Button
              key={action.label}
              type="button"
              size="sm"
              variant={action.primary ? 'default' : 'secondary'}
              disabled={action.primary && checking}
              onClick={action.onClick}
              className="h-auto! min-h-8 min-w-0 px-2! py-1 text-center leading-4 whitespace-normal"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      <DupeCheckDialog
        open={checkOpen}
        onOpenChange={setCheckOpen}
        title={item.title}
        ownerName={ownerName}
        checking={checking}
        result={result}
        error={error}
        onRetry={() => void runCheck()}
        onCompare={onCompare}
      />
    </div>
  )
}
