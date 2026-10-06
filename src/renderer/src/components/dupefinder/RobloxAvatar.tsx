import { useState } from 'react'
import { getRobloxAvatarUrl } from '@renderer/lib/dupesApi'

export function RobloxAvatar({
  userId,
  label,
  className = 'h-10 w-10'
}: {
  userId: string
  label?: string
  className?: string
}): React.JSX.Element {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const avatarId = typeof userId === 'string' ? userId : ''
  const fallbackLabel = (typeof label === 'string' && label ? label : avatarId).trim()
  const src = avatarId ? getRobloxAvatarUrl(avatarId) : ''

  if (src && src !== failedSrc) {
    return (
      <img
        src={src}
        alt=""
        draggable={false}
        onError={() => setFailedSrc(src)}
        className={`${className} shrink-0 rounded-full object-cover`}
      />
    )
  }
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-tertiary-bg text-xs font-semibold text-secondary-text`}
    >
      {fallbackLabel.slice(0, 2).toUpperCase() || '?'}
    </div>
  )
}
