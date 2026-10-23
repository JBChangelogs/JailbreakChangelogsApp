import { useEffect } from 'react'
import { useRealtime } from '@renderer/contexts/RealtimeContext'

const MAX_JITTER_MS = 60_000

export function useRealtimeUpdates(): void {
  const { subscribe } = useRealtime()

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const off = subscribe((message) => {
      if (message.action !== 'app_update' || timer) return
      timer = setTimeout(() => {
        timer = null
        window.api.updater.checkNow()
      }, Math.random() * MAX_JITTER_MS)
    })
    return () => {
      off()
      if (timer) clearTimeout(timer)
    }
  }, [subscribe])
}
