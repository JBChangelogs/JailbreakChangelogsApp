import { useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { PresenceDot } from '@renderer/components/messages/PresenceDot'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { useSettingsPage } from '@renderer/contexts/SettingsPageContext'

function LogoutIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M18 12H8.25m0 0 3-3m-3 3 3 3"
      />
    </svg>
  )
}

function SettingsGearIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function AccountPanel(): React.JSX.Element | null {
  const { token, logout } = useAuth()
  const { user } = useCurrentUser()
  const { open: openSettings } = useSettingsPage()
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (!token) return null
  const displayName = user?.username || user?.name || 'Loading…'
  const subtitle = user?.name && user.name !== displayName ? user.name : undefined
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex w-full items-center gap-2.5 rounded-lg p-2">
      <div className="relative shrink-0">
        {user?.avatar && user.avatar !== failedSrc ? (
          <img
            src={user.avatar}
            alt=""
            draggable={false}
            onError={() => setFailedSrc(user.avatar)}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-quaternary-bg text-sm font-semibold text-secondary-text">
            {initials}
          </div>
        )}
        <PresenceDot presence={user?.presence} className="absolute -right-0.5 -bottom-0.5 h-3 w-3" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-primary-text">{displayName}</p>
        {subtitle && <p className="truncate text-xs text-tertiary-text">{subtitle}</p>}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => openSettings()}
            aria-label="Settings"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
          >
            <SettingsGearIcon className="h-4.5 w-4.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Settings</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={logout}
            aria-label="Log out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-status-error"
          >
            <LogoutIcon className="h-4.5 w-4.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Log out</TooltipContent>
      </Tooltip>
    </div>
  )
}
