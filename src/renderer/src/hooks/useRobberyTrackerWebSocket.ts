import { useAuth } from '@renderer/contexts/AuthContext'
import { useTrackerWebSocket, type TrackerWebSocketReturn } from '@renderer/hooks/useTrackerWebSocket'
import type { RobberyData } from '@shared/robbery'

export function useRobberyTrackerWebSocket(
  enabled: boolean,
  userId?: string | null
): TrackerWebSocketReturn<RobberyData> {
  const { token } = useAuth()
  return useTrackerWebSocket<RobberyData>({
    endpoint: '/tracker',
    messageAction: 'recent_robberies',
    enabled,
    token,
    userId,
    logPrefix: 'Robbery tracker'
  })
}
