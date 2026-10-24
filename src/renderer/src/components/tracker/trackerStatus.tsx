import { Button } from '@renderer/components/ui/button'
import type { EmptyStateContent } from '@renderer/components/ui/empty-state'

export type TrackerStatus = EmptyStateContent

export function trackerProblem({
  isBanned,
  banRemainingSeconds,
  requiresManualReconnect,
  error,
  isConnecting,
  reconnect,
  reconnectFromBan
}: {
  isBanned: boolean
  banRemainingSeconds: number | null
  requiresManualReconnect: boolean
  error: string | undefined
  isConnecting: boolean
  reconnect: () => void
  reconnectFromBan: () => void
}): TrackerStatus | null {
  if (isBanned) {
    return {
      icon: 'banned',
      tone: 'error',
      title: "You've been temporarily banned from the tracker",
      description:
        banRemainingSeconds != null
          ? `You can try again in about ${Math.ceil(banRemainingSeconds / 60)} minutes.`
          : 'You can try again shortly.',
      action: { label: 'Try again', onClick: reconnectFromBan }
    }
  }
  if (requiresManualReconnect) {
    return {
      icon: 'device',
      tone: 'error',
      title: 'Tracker open somewhere else',
      description: 'You connected from another device or tab, so live updates paused here.',
      action: { label: 'Reconnect here', onClick: reconnect }
    }
  }
  if (error) {
    return {
      icon: 'signalSlash',
      tone: 'error',
      title: "Couldn't connect to the tracker",
      description: error.endsWith('.') ? error : `${error}. Check your internet connection, then try again.`,
      action: { label: 'Retry', onClick: reconnect }
    }
  }
  if (isConnecting) {
    return {
      icon: 'spinner',
      tone: 'neutral',
      title: 'Connecting to the tracker',
      description: 'Live data will show up in a moment.'
    }
  }
  return null
}

export function TrackerStatusBanner({ status }: { status: TrackerStatus }): React.JSX.Element {
  return (
    <div
      className={`flex items-center justify-center gap-3 border-b border-border-primary px-4 py-2 text-sm ${status.tone === 'error' ? 'bg-status-error/10 text-status-error' : 'bg-tertiary-bg text-secondary-text'
        }`}
    >
      {status.title}
      {status.action && (
        <Button size="sm" variant="ghost" onClick={status.action.onClick}>
          {status.action.label}
        </Button>
      )}
    </div>
  )
}
