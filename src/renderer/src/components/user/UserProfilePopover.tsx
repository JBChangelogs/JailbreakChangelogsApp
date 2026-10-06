import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { UserAvatar } from '@renderer/components/messages/UserAvatar'
import { UserBadges } from '@renderer/components/user/UserBadges'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { usersApi } from '@renderer/lib/usersApi'
import type { UserProfile } from '@shared/user'

function DiscordIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  )
}

function RobloxIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.926 23.998 0 18.892 5.075.002 24 5.108ZM15.348 10.09l-5.282-1.453-1.414 5.273 5.282 1.453z" />
    </svg>
  )
}

interface UserProfilePopoverProps {
  userId: string
  profile?: UserProfile
  align?: 'start' | 'center' | 'end'
  children: React.ReactNode
}

export function UserProfilePopover({
  userId,
  profile,
  align = 'start',
  children
}: UserProfilePopoverProps): React.JSX.Element {
  const { token } = useAuth()
  const { user: currentUser } = useCurrentUser()
  const [fetched, setFetched] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const displayProfile = profile ?? fetched

  const handleOpenChange = (open: boolean): void => {
    if (!open || profile || fetched || loading || !token) return
    setLoading(true)
    setError(false)
    usersApi
      .get(token, userId)
      .then(setFetched)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  const label = displayProfile?.global_name || displayProfile?.username || displayProfile?.name
  const settings = displayProfile?.settings as { profile_public?: boolean } | undefined
  const isPrivate = settings?.profile_public === false && currentUser?.id !== userId

  return (
    <Popover modal onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-64 p-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {!displayProfile ? (
          <p className="py-3 text-center text-xs text-quaternary-text">
            {error ? 'Failed to load profile.' : 'Loading…'}
          </p>
        ) : (
          <div className="flex gap-2.5">
            <UserAvatar id={userId} profile={displayProfile} className="h-11 w-11 shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-primary-text">{label}</h3>
              <p className="truncate text-xs text-secondary-text">@{displayProfile.username}</p>

              <div className="mt-1.5">
                <UserBadges
                  usernumber={displayProfile.usernumber}
                  premiumType={displayProfile.premiumtype}
                  flags={displayProfile.flags}
                  primaryGuild={displayProfile.primary_guild}
                  size="sm"
                />
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => void window.api.openExternal(`https://discord.com/users/${userId}`)}
                  className="inline-flex items-center gap-1 rounded-md border border-border-card bg-tertiary-bg px-1.5 py-1 text-[11px] font-medium text-primary-text transition-colors hover:bg-quaternary-bg/60"
                >
                  <DiscordIcon className="h-3 w-3" />
                  Discord
                </button>
                {displayProfile.roblox &&
                  (() => {
                    const roblox = displayProfile.roblox
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          void window.api.openExternal(`https://www.roblox.com/users/${roblox.roblox_id}/profile`)
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-border-card bg-tertiary-bg px-1.5 py-1 text-[11px] font-medium text-primary-text transition-colors hover:bg-quaternary-bg/60"
                      >
                        <RobloxIcon className="h-3 w-3" />
                        Roblox
                      </button>
                    )
                  })()}
              </div>

              <div className="mt-1.5 text-xs">
                {isPrivate ? (
                  <p className="text-secondary-text italic">Profile is private</p>
                ) : (
                  displayProfile.usernumber != null &&
                  displayProfile.created_at && (
                    <p className="text-secondary-text">
                      Member #{displayProfile.usernumber} since{' '}
                      {new Date(Number(displayProfile.created_at) * 1000).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
