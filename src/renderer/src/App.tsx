import { useEffect, useRef, useState } from 'react'
import { TitleBar } from '@renderer/components/TitleBar'
import { LoginGate } from '@renderer/components/LoginGate'
import { TransitionSplash } from '@renderer/components/TransitionSplash'
import { UpdateBanner } from '@renderer/components/UpdateBanner'
import { HomeScreen } from '@renderer/components/HomeScreen'
import { ToastViewport } from '@renderer/components/notifications/ToastViewport'
import { SettingsPage } from '@renderer/components/settings/SettingsPage'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useSettingsPage } from '@renderer/contexts/SettingsPageContext'
import { useRealtimePreferences } from '@renderer/hooks/useRealtimePreferences'
import { useNotificationToasts } from '@renderer/hooks/useNotificationToasts'
import { useDesktopNotificationClicks } from '@renderer/hooks/useDesktopNotificationClicks'
import { useRobloxPresence } from '@renderer/hooks/useRobloxPresence'

const TRANSITION_SPLASH_MS = 550
const TRANSITION_FADE_MS = 450

function App(): React.JSX.Element {
  const { status } = useAuth()
  const { isOpen: settingsOpen } = useSettingsPage()
  const isAuthenticated = status === 'authenticated'
  const isChecking = status === 'checking'
  useRealtimePreferences()
  useNotificationToasts()
  useDesktopNotificationClicks()
  useRobloxPresence()
  const prevStatusRef = useRef(status)
  const [showTransitionSplash, setShowTransitionSplash] = useState(false)
  const [transitionSplashVisible, setTransitionSplashVisible] = useState(false)

  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = status

    const isLogin = prev === 'waiting' && status === 'authenticated'
    const isLogout = prev === 'authenticated' && status === 'idle'
    if (!isLogin && !isLogout) return undefined

    setShowTransitionSplash(true)
    setTransitionSplashVisible(true)
    const hideTimeout = setTimeout(() => setTransitionSplashVisible(false), TRANSITION_SPLASH_MS)
    const unmountTimeout = setTimeout(
      () => setShowTransitionSplash(false),
      TRANSITION_SPLASH_MS + TRANSITION_FADE_MS
    )
    return () => {
      clearTimeout(hideTimeout)
      clearTimeout(unmountTimeout)
    }
  }, [status])
  useEffect(() => {
    if (isChecking) return
    const splash = document.getElementById('splash')
    if (!splash) return
    splash.classList.add('splash-hidden')
    const remove = (): void => splash.remove()
    splash.addEventListener('transitionend', remove, { once: true })
    const timeout = setTimeout(remove, 400)
    return () => {
      splash.removeEventListener('transitionend', remove)
      clearTimeout(timeout)
    }
  }, [isChecking])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-primary-bg text-primary-text">
      <UpdateBanner />
      <TitleBar />

      <div className="relative flex flex-1 overflow-hidden">
        {isChecking ? null : !isAuthenticated ? <LoginGate /> : !settingsOpen ? <HomeScreen /> : null}
        {showTransitionSplash && <TransitionSplash visible={transitionSplashVisible} />}
        {isAuthenticated && <SettingsPage />}
      </div>
      <ToastViewport />
    </div>
  )
}

export default App
