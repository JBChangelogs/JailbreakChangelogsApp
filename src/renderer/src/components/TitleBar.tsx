import { useEffect, useState } from 'react'
import { AnimatedThemeToggler } from '@renderer/components/ui/animated-theme-toggler'
import { NotificationsPopover } from '@renderer/components/notifications/NotificationsPopover'
import appIcon from '@renderer/assets/icon.png'
import { useRealtime } from '@renderer/contexts/RealtimeContext'

type DragCSS = React.CSSProperties & { WebkitAppRegion?: 'drag' | 'no-drag' }

const DRAG: DragCSS = { WebkitAppRegion: 'drag' }
const NO_DRAG: DragCSS = { WebkitAppRegion: 'no-drag' }
function MinimizeIcon(): React.JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <rect y="4.5" width="10" height="1" fill="currentColor" />
    </svg>
  )
}

function MaximizeIcon(): React.JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" />
    </svg>
  )
}

function RestoreIcon(): React.JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <rect x="2.5" y="0.5" width="7" height="7" fill="none" stroke="currentColor" />
      <rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" />
    </svg>
  )
}

function CloseIcon(): React.JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1" />
      <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function TitleBar(): React.JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)
  const { location } = useRealtime()
  const isMac = window.electron.process.platform === 'darwin'

  useEffect(() => {
    window.api.window.isMaximized().then(setIsMaximized)
    return window.api.window.onMaximizedChange(setIsMaximized)
  }, [])

  return (
    <div
      className="flex h-9 shrink-0 select-none items-center justify-between border-b border-border-primary bg-secondary-bg"
      style={DRAG}
    >
      <div className={`flex items-center gap-2 px-3 text-xs font-semibold text-secondary-text ${isMac ? 'pl-20' : ''}`}>
        <img src={appIcon} alt="" className="h-6 w-6 shrink-0" draggable={false} />
        <span className="text-primary-text">Jailbreak Changelogs</span>
      </div>
      {location && (
        <div className="text-xs text-secondary-text">
          {capitalize(location)}
        </div>
      )}
      <div className="flex h-full items-center" style={NO_DRAG}>
        <NotificationsPopover />
        <AnimatedThemeToggler
          size="sm"
          className="h-full w-11 rounded-none border-0 bg-transparent hover:bg-quaternary-bg hover:text-primary-text"
        />

        {!isMac && (
          <>
            <button
              onClick={() => window.api.window.minimize()}
              className="flex h-full w-11 items-center justify-center text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
              aria-label="Minimize"
            >
              <MinimizeIcon />
            </button>
            <button
              onClick={() => window.api.window.toggleMaximize()}
              className="flex h-full w-11 items-center justify-center text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
            </button>
            <button
              onClick={() => window.api.window.close()}
              className="flex h-full w-11 items-center justify-center text-secondary-text transition-colors hover:bg-status-error hover:text-white"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
