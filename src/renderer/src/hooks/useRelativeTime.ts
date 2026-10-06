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

export function useRelativeTime(unixSeconds: number | null | undefined): string | null {
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (unixSeconds == null) return undefined
    const interval = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(interval)
  }, [unixSeconds])

  if (unixSeconds == null) return null
  return formatRelative(unixSeconds)
}
