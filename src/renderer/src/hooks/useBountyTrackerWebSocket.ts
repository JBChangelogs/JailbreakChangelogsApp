import { useAuth } from '@renderer/contexts/AuthContext'
import { useTrackerWebSocket, type TrackerWebSocketReturn } from '@renderer/hooks/useTrackerWebSocket'
import type { BountyData } from '@shared/bounty'

export function useBountyTrackerWebSocket(
  enabled: boolean,
  userId?: string | null
): TrackerWebSocketReturn<BountyData> {
  const { token } = useAuth()
  return useTrackerWebSocket<BountyData>({
    endpoint: '/tracker?type=bounties',
    messageAction: 'recent_bounties',
    enabled,
    token,
    userId,
    logPrefix: 'Bounty tracker'
  })
}
