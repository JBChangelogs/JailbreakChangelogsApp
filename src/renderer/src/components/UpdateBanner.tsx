import { lazy, Suspense, useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { formatMegabytes, useUpdateStatus } from '@renderer/hooks/useUpdateStatus'
import { downloadUpdatePreview } from '@renderer/lib/updatePreview'

const Markdown = lazy(() => import('@renderer/components/ui/markdown').then((m) => ({ default: m.Markdown })))

function CloudDownloadIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96ZM17 13l-5 5-5-5h3V9h4v4h3Z" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
    </svg>
  )
}

export function UpdateNotesDialog({
  open,
  onOpenChange,
  version,
  notes
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: string | null
  notes: string | null
}): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>What's new{version ? ` in ${version}` : ''}</DialogTitle>
          <DialogDescription>Changes in this update.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm text-secondary-text">
          {notes ? (
            <Suspense fallback={null}>
              <Markdown className="[&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:tracking-wide [&_h3]:text-primary-text [&_h3]:uppercase [&_h3:first-child]:mt-0 [&_li]:my-1">
                {notes}
              </Markdown>
            </Suspense>
          ) : (
            <p>No release notes for this update.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function UpdateBanner(): React.JSX.Element | null {
  const { status, isPreview, version, notes, size, clear } = useUpdateStatus()
  const [notesOpen, setNotesOpen] = useState(false)
  const installing = status?.state === 'downloaded' && status.source !== 'startup'

  useEffect(() => {
    if (!installing) return
    const timer = setTimeout(() => (isPreview ? clear() : window.api.updater.quitAndInstall()), 1200)
    return () => clearTimeout(timer)
  }, [installing, isPreview, clear])

  if (!status) return null
  if ('source' in status && status.source === 'startup') return null
  if (status.state !== 'available' && status.state !== 'downloading' && status.state !== 'downloaded') return null

  const downloading = status.state === 'downloading'
  const percent = status.state === 'downloading' ? status.percent : undefined
  const title = version ? `Version ${version}` : 'A new version'
  const stage = status.state === 'available' ? 'is available' : downloading ? 'Downloading…' : 'Installing…'
  const detail = [size ? formatMegabytes(size) : null, stage].filter(Boolean).join(' · ')

  const onUpdate = (): void => {
    if (isPreview) return downloadUpdatePreview()
    window.api.updater.download()
  }

  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border-primary bg-secondary-bg px-4">
      <CloudDownloadIcon className="h-5 w-5 shrink-0 text-status-info" />
      <p className="min-w-0 flex-1 truncate text-sm">
        <span className="font-bold text-primary-text">{title}</span>
        <span className="ml-2 text-xs text-tertiary-text">{detail}</span>
      </p>
      {notes && (
        <button
          type="button"
          onClick={() => setNotesOpen(true)}
          className="shrink-0 text-xs font-semibold text-secondary-text underline-offset-4 transition-colors hover:text-primary-text hover:underline"
        >
          What's new
        </button>
      )}
      {downloading || installing ? (
        <div className="flex w-36 shrink-0 items-center gap-2" aria-label="Download progress">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-status-info/20">
            {installing ? (
              <div className="h-full w-full rounded-full bg-status-info" />
            ) : typeof percent === 'number' ? (
              <div
                className="h-full rounded-full bg-status-info transition-[width] duration-150 ease-linear"
                style={{ width: `${percent}%` }}
              />
            ) : (
              <div className="animate-update-indeterminate h-full w-1/4 rounded-full bg-status-info" />
            )}
          </div>
          <span className="w-9 text-right text-xs text-secondary-text tabular-nums">
            {installing ? '100%' : typeof percent === 'number' ? `${Math.floor(percent)}%` : ''}
          </span>
        </div>
      ) : (
        <Button type="button" size="sm" onClick={onUpdate}>
          <DownloadIcon className="h-3.5 w-3.5" />
          Update
        </Button>
      )}
      <UpdateNotesDialog open={notesOpen} onOpenChange={setNotesOpen} version={version} notes={notes} />
    </div>
  )
}
