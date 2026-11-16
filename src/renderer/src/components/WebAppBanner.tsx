import { useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import { getWebAppBannerShown, setWebAppBannerShown } from '@renderer/lib/localPreferences'

const INSTALL_URL = 'https://jailbreakchangelogs.com/app'
const OPEN_URL = 'jailbreakchangelogs://open'

export function WebAppBanner(): React.JSX.Element | null {
  const [shown, setShown] = useState(
    () => window.api.platform === 'web' && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && getWebAppBannerShown()
  )
  if (!shown) return null

  const dismiss = (): void => {
    setWebAppBannerShown(false)
    setShown(false)
  }

  return (
    <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-primary bg-secondary-bg px-4 py-1.5">
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-bold text-primary-text">Get the desktop app</span>
        <span className="ml-2 text-xs text-tertiary-text">Notifications, trade scanning and Discord status</span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => (window.location.href = OPEN_URL)}>
          Open app
        </Button>
        <Button type="button" size="sm" onClick={() => void window.api.openExternal(INSTALL_URL)}>
          Install
        </Button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="flex h-7 w-7 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
