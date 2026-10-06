import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/button'

type UpdaterStatus =
  | { state: 'checking' }
  | { state: 'available' }
  | { state: 'downloading'; percent?: number }
  | { state: 'not-available' }
  | { state: 'downloaded'; version: string }
  | { state: 'manual'; version: string; url: string }
  | { state: 'error'; message: string }

function RestartIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 15a8 8 0 0 0 14.5 3.5M19.5 9A8 8 0 0 0 5 5.5"
      />
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

function CheckCircleIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  )
}

export function UpdateBanner(): React.JSX.Element | null {
  const [status, setStatus] = useState<UpdaterStatus | null>(null)

  useEffect(() => window.api.updater.onStatus(setStatus), [])

  if (!status) return null

  if (status.state === 'downloading') {
    const hasPercent = typeof status.percent === 'number'
    return (
      <div className="relative flex h-9 shrink-0 items-center justify-center gap-2 border-b border-border-primary bg-secondary-bg text-xs text-secondary-text">
        <DownloadIcon className="h-3.5 w-3.5 text-status-info" />
        <span>Downloading update{hasPercent ? ` — ${status.percent}%` : '…'}</span>
        <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
          {hasPercent ? (
            <div
              className="h-full bg-status-info transition-[width] duration-150 ease-linear"
              style={{ width: `${status.percent}%` }}
            />
          ) : (
            <div className="animate-update-indeterminate h-full w-1/4 bg-status-info" />
          )}
        </div>
      </div>
    )
  }

  if (status.state === 'manual') {
    return (
      <div className="flex h-9 shrink-0 items-center justify-center gap-2.5 border-b border-border-primary bg-secondary-bg text-xs text-secondary-text">
        <DownloadIcon className="h-3.5 w-3.5 text-status-info" />
        <span>Version {status.version} is available</span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-6! gap-1! px-2!"
          onClick={() => void window.api.openExternal(status.url)}
        >
          <DownloadIcon className="h-3 w-3" />
          Download
        </Button>
      </div>
    )
  }

  if (status.state !== 'downloaded') return null

  return (
    <div className="flex h-9 shrink-0 items-center justify-center gap-2.5 border-b border-border-primary bg-secondary-bg text-xs text-secondary-text">
      <CheckCircleIcon className="h-3.5 w-3.5 text-status-success-vibrant" />
      <span>Update ready ({status.version})</span>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-6! gap-1! px-2!"
        onClick={() => window.api.updater.quitAndInstall()}
      >
        <RestartIcon className="h-3 w-3" />
        Restart
      </Button>
    </div>
  )
}
