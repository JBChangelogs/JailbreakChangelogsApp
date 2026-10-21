import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { groupChatsApi } from '@renderer/lib/messagesApi'
import type { UserProfile } from '@shared/user'
import { PresenceDot } from '@renderer/components/messages/PresenceDot'
import { avatarShapeClass } from '@renderer/lib/profileLook'

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
        className={`${className} shrink-0 object-cover ${avatarShapeClass(profile)}`}
      />
    )
  }
  const label = profile?.username || profile?.name || id
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center bg-tertiary-bg text-xs font-semibold text-secondary-text ${avatarShapeClass(profile)}`}
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

// Keyed by group + membership, so the icon refetches when members change.
// ponytail: blob URLs are never revoked; fine for a handful of groups per session.
const groupIconCache = new Map<string, Promise<string | null>>()

function membershipVersion(memberIds: string[]): string {
  let hash = 5381
  for (const ch of [...memberIds].sort().join(',')) hash = ((hash * 33) ^ ch.charCodeAt(0)) >>> 0
  return hash.toString(36)
}

function useGroupIcon(groupId: string, memberIds: string[]): string | null {
  const { token } = useAuth()
  const version = membershipVersion(memberIds)
  const cacheKey = `${groupId}:${version}`
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    let pending = groupIconCache.get(cacheKey)
    if (!pending) {
      pending = groupChatsApi
        .fetchIcon(token, groupId, version)
        .then((blob) => URL.createObjectURL(blob))
        .catch(() => null)
      groupIconCache.set(cacheKey, pending)
    }
    void pending.then((url) => {
      if (!cancelled) setSrc(url)
    })
    return () => {
      cancelled = true
    }
  }, [token, groupId, version, cacheKey])

  return src
}

interface GroupAvatarProps {
  groupId: string
  memberIds: string[]
  // Shown as two overlapping avatars while the icon loads or if it fails.
  fallbackIds: string[]
  profiles: Map<string, UserProfile>
  className?: string
}

export function GroupAvatar({
  groupId,
  memberIds,
  fallbackIds,
  profiles,
  className = 'h-8 w-8'
}: GroupAvatarProps): React.JSX.Element {
  const icon = useGroupIcon(groupId, memberIds)
  if (icon) {
    // The icon is already circles on a transparent background, so it's drawn as-is.
    return <img src={icon} alt="" draggable={false} className={`${className} shrink-0`} />
  }
  const [first, second] = fallbackIds
  if (!second) return <UserAvatar id={first ?? ''} profile={profiles.get(first)} className={className} />
  return (
    <div className={`${className} relative shrink-0`}>
      <UserAvatar id={first} profile={profiles.get(first)} className="absolute top-0 left-0 h-[62%] w-[62%]" />
      <div className="absolute right-0 bottom-0 h-[62%] w-[62%] rounded-full ring-2 ring-secondary-bg">
        <UserAvatar id={second} profile={profiles.get(second)} className="h-full w-full" />
      </div>
    </div>
  )
}
