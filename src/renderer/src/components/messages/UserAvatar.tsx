import { useState } from 'react'
import type { UserProfile } from '@shared/user'
import { PresenceDot } from '@renderer/components/messages/PresenceDot'

interface UserAvatarProps {
  id: string
  profile?: UserProfile
  className?: string
}

interface UserAvatarWithPresenceProps extends UserAvatarProps {
  typing?: boolean
}

export function UserAvatar({ id, profile, className = 'h-10 w-10' }: UserAvatarProps): React.JSX.Element {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (profile?.avatar && profile.avatar !== failedSrc) {
    return (
      <img
        src={profile.avatar}
        alt=""
        draggable={false}
        onError={() => setFailedSrc(profile.avatar)}
        className={`${className} shrink-0 rounded-full object-cover`}
      />
    )
  }
  const label = profile?.username || profile?.name || id
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-tertiary-bg text-xs font-semibold text-secondary-text`}
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  )
}

export function UserAvatarWithPresence({
  id,
  profile,
  typing = false,
  className = 'h-10 w-10'
}: UserAvatarWithPresenceProps): React.JSX.Element {
  return (
    <div className="relative shrink-0">
      <UserAvatar id={id} profile={profile} className={className} />
      <PresenceDot
        presence={profile?.presence}
        typing={typing}
        className="absolute right-0 bottom-0 h-2.5 w-2.5"
      />
    </div>
  )
}
