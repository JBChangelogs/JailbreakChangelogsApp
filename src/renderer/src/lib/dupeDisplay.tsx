import type { RobloxUserSummary } from '@shared/dupe'

export function userDisplay(user: RobloxUserSummary | null | undefined, fallbackId: string): string {
  return user?.displayName || user?.name || fallbackId
}

export function userHandle(user: RobloxUserSummary | null | undefined, fallbackId: string): string {
  return user?.name || fallbackId
}

export function formatUsd(value: number): string {
  return `$${value.toLocaleString()}`
}

export function formatUsdCompact(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toLocaleString()}`
}

export function VerifiedIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 1 2.6 2.2 3.4-.4 1 3.3 3.1 1.6-.9 3.3 1.9 2.9L21 16l.2 3.4-3.3.6-1.9 2.8-3.1-1.3L12 23l-2.9-1.5-3.1 1.3-1.9-2.8-3.3-.6L1 16l-1.9-2.1 1.9-2.9-.9-3.3 3.1-1.6 1-3.3 3.4.4Z" />
      <path
        d="M8.5 12.5 11 15l4.5-5.5"
        fill="none"
        stroke="var(--color-secondary-bg)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
