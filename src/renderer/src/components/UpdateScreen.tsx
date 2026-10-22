import { useEffect } from 'react'
import appIcon from '@renderer/assets/icon.png'
import { formatMegabytes, useUpdateStatus } from '@renderer/hooks/useUpdateStatus'

const SEGMENTS = 32
const INSTALL_DELAY_MS = 1200

function Segments({ percent }: { percent: number }): React.JSX.Element {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * SEGMENTS)
  return (
    <div
      className="flex gap-[3px]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-[2px] transition-colors duration-150 ${i < filled ? 'bg-status-info' : 'bg-status-info/20'}`}
        />
      ))}
    </div>
  )
}

export function UpdateScreen(): React.JSX.Element | null {
  const { status, isPreview, version, clear } = useUpdateStatus()
  const active =
    status !== null &&
    (status.state === 'available' || status.state === 'downloading' || status.state === 'downloaded') &&
    status.source === 'startup'
  const installing = active && status.state === 'downloaded'

  useEffect(() => {
    if (!installing) return
    const timer = setTimeout(() => (isPreview ? clear() : window.api.updater.quitAndInstall()), INSTALL_DELAY_MS)
    return () => clearTimeout(timer)
  }, [installing, isPreview, clear])

  if (!active) return null

  const progress =
    status.state === 'downloading'
      ? status
      : { percent: installing ? 100 : 0, transferred: undefined, total: undefined }
  const percent = progress.percent ?? 0
  const detail = installing
    ? 'Restarting…'
    : progress.transferred !== undefined && progress.total
      ? `${formatMegabytes(progress.transferred).replace(' MB', '')} of ${formatMegabytes(progress.total)} (${percent.toFixed(1)}%)`
      : 'Starting download…'

  return (
    <div className="absolute inset-0 z-[1300] flex items-center justify-center bg-primary-bg">
      <div className="flex w-[448px] max-w-[calc(100%-2rem)] flex-col items-center rounded-2xl border border-border-card bg-secondary-bg px-10 py-10 shadow-2xl">
        <img src={appIcon} alt="" className="h-14 w-14" draggable={false} />
        <h2 className="mt-5 text-lg font-bold text-primary-text">
          {installing ? 'Installing update' : 'Downloading update'}
        </h2>
        {version && <p className="mt-1 text-sm text-secondary-text">Version {version}</p>}
        <div className="mt-6">
          <Segments percent={percent} />
        </div>
        <p className="mt-5 text-base text-secondary-text tabular-nums">{detail}</p>
      </div>
    </div>
  )
}
