import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { UserAvatar } from '@renderer/components/messages/UserAvatar'
import { PresenceDot } from '@renderer/components/messages/PresenceDot'
import { UserBadges } from '@renderer/components/user/UserBadges'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { usersApi } from '@renderer/lib/usersApi'
import { FriendButton } from '@renderer/components/user/FriendButton'
import { accentCardTheme } from '@renderer/lib/accentColor'
import { cn } from '@renderer/lib/utils'
import {
  avatarShapeClass,
  hidesPresence,
  isProfilePrivate,
  profileAccent,
  profileBackground,
  profileBanner
} from '@renderer/lib/profileLook'
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

function ProfileIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.12a7.5 7.5 0 0 1 15 0A17.93 17.93 0 0 1 12 21.75c-2.68 0-5.22-.59-7.5-1.63Z"
      />
    </svg>
  )
}

const NO_DESCRIPTION = 'No description provided'

interface FullProfile {
  profile: UserProfile
  description: string | null
}

// The batch lookups that feed lists don't carry everything the card shows, so it loads the
// full user and their description once per user per session.
const fullProfiles = new Map<string, Promise<FullProfile>>()

function loadFullProfile(token: string, userId: string): Promise<FullProfile> {
  let pending = fullProfiles.get(userId)
  if (!pending) {
    pending = Promise.all([
      usersApi.get(token, userId),
      usersApi.description(token, userId).catch(() => null)
    ]).then(([profile, description]) => ({
      profile,
      description: description && description !== NO_DESCRIPTION ? description : null
    }))
    pending.catch(() => fullProfiles.delete(userId))
    fullProfiles.set(userId, pending)
  }
  return pending
}

// Plain text like the website: combining marks stripped (they stack into "zalgo"), links clickable.
const URL_PATTERN = /(https?:\/\/[^\s]+)/g

function Description({ text }: { text: string }): React.JSX.Element {
  return (
    <p className="mt-3 line-clamp-5 text-sm break-words whitespace-pre-wrap text-primary-text/90">
      {text
        .replace(/\p{M}+/gu, '')
        .split(URL_PATTERN)
        .map((part, i) =>
          i % 2 === 1 ? (
            <button
              key={i}
              type="button"
              onClick={() => void window.api.openExternal(part)}
              className="text-link hover:text-link-hover hover:underline"
            >
              {part}
            </button>
          ) : (
            part
          )
        )}
    </p>
  )
}

function Banner({
  userId,
  profile,
  isPrivate
}: {
  userId: string
  profile: UserProfile
  isPrivate: boolean
}): React.JSX.Element {
  const { primary, fallback } = profileBanner(userId, profile, isPrivate)
  const [failed, setFailed] = useState(false)
  const src = primary && !failed ? primary : fallback
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      onError={src === primary ? () => setFailed(true) : undefined}
      className="h-24 w-full object-cover"
    />
  )
}

interface UserProfilePopoverProps {
  userId: string
  profile?: UserProfile
  side?: 'right' | 'bottom'
  children: React.ReactNode
}

export function UserProfilePopover({ userId, profile, side = 'right', children }: UserProfilePopoverProps): React.JSX.Element {
  const { token } = useAuth()
  const { user: currentUser } = useCurrentUser()
  const [full, setFull] = useState<FullProfile | null>(null)
  const [error, setError] = useState(false)

  const handleOpenChange = (open: boolean): void => {
    if (!open || full || !token) return
    setError(false)
    loadFullProfile(token, userId)
      .then(setFull)
      .catch(() => setError(true))
  }

  // Live presence comes from the passed profile; the rest from the full one once loaded.
  const displayProfile = full ? { ...full.profile, presence: profile?.presence ?? full.profile.presence } : profile
  const label = displayProfile?.global_name || displayProfile?.username || displayProfile?.name
  const isPrivate = displayProfile ? isProfilePrivate(displayProfile, currentUser?.id) : false
  const showPresence = displayProfile && !isPrivate && !hidesPresence(displayProfile)
  const accent = displayProfile ? profileAccent(displayProfile) : null
  const background = displayProfile ? profileBackground(displayProfile) : null
  const cardColor = accent ? 'bg-secondary-bg' : background ? '' : 'bg-primary-bg'
  const isOwn = currentUser?.id === userId

  return (
    <Popover modal onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      {/* Always beside what was clicked (flipping sides near an edge), never over it. */}
      <PopoverContent
        side={side}
        align="start"
        sideOffset={side === 'bottom' ? 8 : 12}
        collisionPadding={12}
        className="relative isolate w-80 overflow-hidden rounded-2xl p-0"
        data-accent-cards={accent?.style}
        style={accent ? accentCardTheme(accent) : undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {!displayProfile ? (
          <p className="py-6 text-center text-xs text-quaternary-text">
            {error ? 'Failed to load profile.' : 'Loading…'}
          </p>
        ) : (
          <>
            {background && (
              <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                <img src={background} alt="" draggable={false} className="h-full w-full object-cover object-top" />
                <div className="absolute inset-0 bg-primary-bg/85" />
              </div>
            )}
            <div className={cn('relative', accent && 'bg-secondary-bg')}>
            <Banner
              key={`${userId}:${displayProfile.custom_banner ?? displayProfile.banner}:${isPrivate}`}
              userId={userId}
              profile={displayProfile}
              isPrivate={isPrivate}
            />
            <div className="relative px-4">
              {/* Overlaps the banner with a ring cut out in the card's color, like Discord. */}
              <div className="relative -mt-11 w-fit">
                <div className={`p-1 ${cardColor} ${avatarShapeClass(displayProfile, true)}`}>
                  <UserAvatar id={userId} profile={displayProfile} className="h-20 w-20" />
                </div>
                {showPresence && (
                  <PresenceDot
                    presence={displayProfile.presence}
                    className={`absolute right-1 bottom-1 h-5 w-5 ring-0! border-4 ${accent ? 'border-secondary-bg' : background ? 'border-transparent' : 'border-primary-bg'}`}
                  />
                )}
              </div>
            </div>
            <div className="px-4 pt-2 pb-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-xl leading-tight font-bold text-primary-text">{label}</h3>
                  <p className="mt-0.5 truncate text-sm text-secondary-text">{displayProfile.username}</p>
                </div>
                {token && !isOwn && (
                  <div className="shrink-0">
                    <FriendButton userId={userId} size="sm" />
                  </div>
                )}
              </div>
              <div className="mt-2">
                <UserBadges
                  usernumber={displayProfile.usernumber}
                  premiumType={displayProfile.premiumtype}
                  flags={displayProfile.flags}
                  size="sm"
                />
              </div>

              {isPrivate ? (
                <p className="mt-3 text-xs text-secondary-text italic">Profile is private</p>
              ) : (
                <>
                  {full?.description && <Description text={full.description} />}
                  {displayProfile.usernumber != null && displayProfile.created_at && (
                    <div className="mt-3">
                      <p className="text-xs font-bold text-secondary-text">Member Since</p>
                      <p className="mt-0.5 text-sm text-primary-text/90">
                        {new Date(Number(displayProfile.created_at) * 1000).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                        <span className="text-tertiary-text"> · Member #{displayProfile.usernumber}</span>
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void window.api.openExternal(`https://jailbreakchangelogs.com/users/${userId}`)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-card bg-tertiary-bg px-2 py-1 text-xs font-medium text-primary-text transition-colors hover:bg-quaternary-bg/60"
                >
                  <ProfileIcon className="h-3.5 w-3.5" />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => void window.api.openExternal(`https://discord.com/users/${userId}`)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-card bg-tertiary-bg px-2 py-1 text-xs font-medium text-primary-text transition-colors hover:bg-quaternary-bg/60"
                >
                  <DiscordIcon className="h-3.5 w-3.5" />
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
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border-card bg-tertiary-bg px-2 py-1 text-xs font-medium text-primary-text transition-colors hover:bg-quaternary-bg/60"
                      >
                        <RobloxIcon className="h-3.5 w-3.5" />
                        Roblox
                      </button>
                    )
                  })()}
              </div>
            </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
