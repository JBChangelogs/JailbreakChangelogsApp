import { useEffect, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useFriends } from '@renderer/hooks/useFriends'
import { useUpdateStatus } from '@renderer/hooks/useUpdateStatus'
import { AnimatedThemeToggler } from '@renderer/components/ui/animated-theme-toggler'
import { NotificationsPopover } from '@renderer/components/notifications/NotificationsPopover'
import appIcon from '@renderer/assets/icon.png'
import { useRealtimeLocation } from '@renderer/contexts/RealtimeContext'
import { useNavigationMode } from '@renderer/contexts/TabsContext'
import { useSettingsPage } from '@renderer/contexts/SettingsPageContext'
import { TabBar } from '@renderer/components/TabBar'

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

function FriendsIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.13a9.38 9.38 0 0 0 2.63.37 9.34 9.34 0 0 0 4.12-.95 4.13 4.13 0 0 0-7.53-2.49M15 19.13v-.01c0-1.11-.29-2.16-.78-3.07M15 19.13v.1A12.32 12.32 0 0 1 8.62 21c-2.33 0-4.51-.64-6.37-1.77v-.11a6.38 6.38 0 0 1 11.96-3.07M12 6.38a3.38 3.38 0 1 1-6.75 0 3.38 3.38 0 0 1 6.75 0Zm8.25 2.25a2.63 2.63 0 1 1-5.25 0 2.63 2.63 0 0 1 5.25 0Z"
      />
    </svg>
  )
}

/** canOpenSettings: Display settings need a signed-in account with app access. */
export function TitleBar({
  canOpenSettings,
  friendsOpen,
  onToggleFriends
}: {
  canOpenSettings: boolean
  friendsOpen: boolean
  onToggleFriends: () => void
}): React.JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)
  const location = useRealtimeLocation()
  const { mode } = useNavigationMode()
  const { isOpen: settingsOpen } = useSettingsPage()
  const { status: updateStatus } = useUpdateStatus()
  const startupUpdating =
    (updateStatus?.state === 'available' || updateStatus?.state === 'downloading' || updateStatus?.state === 'downloaded') &&
    updateStatus.source === 'startup'
  const showTabs = canOpenSettings && mode === 'tabs' && !settingsOpen && !startupUpdating
  const isMac = window.api.platform === 'darwin'
  const friends = useFriends()
  const incomingRequests = friends?.incoming.size ?? 0

  useEffect(() => {
    window.api.window.isMaximized().then(setIsMaximized)
    return window.api.window.onMaximizedChange(setIsMaximized)
  }, [])

  return (
    <div
      className="flex h-9 shrink-0 select-none items-center border-b border-border-primary bg-secondary-bg"
      data-tauri-drag-region="deep"
    >
      <div className={`flex shrink-0 items-center gap-2 px-3 text-xs font-semibold text-secondary-text ${isMac ? 'pl-20' : ''} ${showTabs ? 'h-[34px] w-64 self-end' : ''}`}>
        <img src={appIcon} alt="" className="header-logo h-6 w-6 shrink-0" draggable={false} />
        <span className="text-primary-text">Jailbreak Changelogs</span>
        {canOpenSettings && !startupUpdating && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleFriends}
                aria-label="Friends"
                aria-pressed={friendsOpen}
                data-tauri-drag-region="false"
                className={`relative ml-auto flex h-7 shrink-0 items-center justify-center gap-1 rounded-md px-1.5 transition-colors hover:bg-quaternary-bg hover:text-primary-text ${friendsOpen ? 'bg-quaternary-bg text-primary-text' : 'text-secondary-text'}`}
              >
                <FriendsIcon className="h-4.5 w-4.5" />
                {friends && <span className="text-xs font-semibold tabular-nums">{friends.friends.size}</span>}
                {incomingRequests > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-status-error px-0.5 text-[8px] font-semibold text-white">
                    {incomingRequests > 9 ? '9+' : incomingRequests}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Friends</TooltipContent>
          </Tooltip>
        )}
      </div>
      {showTabs ? (
        <TabBar />
      ) : (
        <div className="min-w-0 flex-1 text-center text-xs text-secondary-text">{location && capitalize(location)}</div>
      )}
      <div className="flex h-full shrink-0 items-center" data-tauri-drag-region="false">
        {!startupUpdating && (
          <>
            <NotificationsPopover />
            <AnimatedThemeToggler
              size="sm"
              canOpenSettings={canOpenSettings}
              className="h-full w-11 rounded-none border-0 bg-transparent hover:bg-quaternary-bg hover:text-primary-text"
            />
          </>
        )}

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
