import { useEffect } from 'react'
import { triggerToastAction } from '@renderer/lib/toast'

export function useDesktopNotificationClicks(): void {
  useEffect(() => window.api.notifications.onClick(triggerToastAction), [])
}
