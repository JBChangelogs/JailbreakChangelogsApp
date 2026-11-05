import { useEffect, useState } from 'react'

function formatRelative(unixSeconds: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  const minutes = Math.floor(diff / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function msUntilLabelChanges(unixSeconds: number): number {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds)
  if (diff < 60) return 1000
  const unit = diff < 3600 ? 60 : diff < 86400 ? 3600 : 86400
  return (unit - (diff % unit)) * 1000
}

export function useRelativeTime(unixSeconds: number | null | undefined): string | null {
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (unixSeconds == null) return undefined
    let timeout: ReturnType<typeof setTimeout>
    const schedule = (): void => {
      timeout = setTimeout(() => {
        forceTick((n) => n + 1)
        schedule()
      }, msUntilLabelChanges(unixSeconds))
    }
    schedule()
    return () => clearTimeout(timeout)
  }, [unixSeconds])

  if (unixSeconds == null) return null
  return formatRelative(unixSeconds)
}
