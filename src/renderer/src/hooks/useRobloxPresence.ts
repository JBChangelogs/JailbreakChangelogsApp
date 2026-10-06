import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { ensureUserSettingsLoaded, findUserSetting } from '@renderer/lib/userSettings'
import { setOwnRobloxActivity } from '@renderer/lib/ownRobloxActivity'

const HEARTBEAT_INTERVAL_MS = 60_000

export function useRobloxPresence(): void {
  const { token } = useAuth()
  const { send } = useRealtime()
  const currentRef = useRef<{ placeId: string; jobId: string | null } | null>(null)

  const sendActivity = useCallback(
    (placeId: string, jobId: string | null) => {
      send({ type: 'roblox_activity', place_id: placeId, job_id: jobId })
    },
    [send]
  )

  useEffect(() => {
    return window.api.onRobloxActivityChanged((event) => {
      setOwnRobloxActivity(event.placeId, event.jobId)

      if (!event.placeId) {
        currentRef.current = null
        send({ type: 'roblox_activity', place_id: null })
        return
      }

      const placeId = event.placeId
      const jobId = event.jobId

      if (!token) {
        currentRef.current = { placeId, jobId }
        sendActivity(placeId, jobId)
        return
      }

      ensureUserSettingsLoaded(token)
        .then(() => {
          if (findUserSetting('hide_roblox_activity') === true) {
            currentRef.current = null
            return
          }
          currentRef.current = { placeId, jobId }
          sendActivity(placeId, jobId)
        })
        .catch(() => {
          currentRef.current = { placeId, jobId }
          sendActivity(placeId, jobId)
        })
    })
  }, [send, token, sendActivity])

  useEffect(() => {
    const interval = setInterval(() => {
      const current = currentRef.current
      if (current) sendActivity(current.placeId, current.jobId)
    }, HEARTBEAT_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [sendActivity])
}
