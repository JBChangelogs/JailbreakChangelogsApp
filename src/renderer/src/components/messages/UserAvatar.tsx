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

// Where each member sits while there's no generated icon, matching the API's icon layouts:
// two overlap diagonally, three are one on top and two below, four make a 2x2 cluster.
const FALLBACK_LAYOUTS: Record<number, React.CSSProperties[]> = {
  2: [
    { top: 0, left: 0, width: '62%', height: '62%' },
    { right: 0, bottom: 0, width: '62%', height: '62%' }
  ],
  3: [
    { top: 0, left: '22%', width: '56%', height: '56%' },
    { bottom: 0, left: 0, width: '56%', height: '56%' },
    { bottom: 0, right: 0, width: '56%', height: '56%' }
  ],
  4: [
    { top: 0, left: 0, width: '54%', height: '54%' },
    { top: 0, right: 0, width: '54%', height: '54%' },
    { bottom: 0, left: 0, width: '54%', height: '54%' },
    { bottom: 0, right: 0, width: '54%', height: '54%' }
  ]
}

interface GroupAvatarProps {
  groupId: string
  memberIds: string[]
  // Up to four of these are shown while the icon loads or if it fails.
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
  const shown = fallbackIds.slice(0, 4)
  if (shown.length <= 1) return <UserAvatar id={shown[0] ?? ''} profile={profiles.get(shown[0])} className={className} />
  const slots = FALLBACK_LAYOUTS[shown.length]
  return (
    <div className={`${className} relative shrink-0`}>
      {shown.map((id, i) => (
        // Later avatars sit on top, cut out from the ones behind by a ring in the background color.
        <div
          key={id}
          className={`absolute ${i > 0 ? 'ring-2 ring-secondary-bg' : ''} ${avatarShapeClass(profiles.get(id))}`}
          style={slots[i]}
        >
          <UserAvatar id={id} profile={profiles.get(id)} className="h-full w-full" />
        </div>
      ))}
    </div>
  )
}
