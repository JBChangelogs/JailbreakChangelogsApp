import { useEffect, useRef, useState } from 'react'
import { FriendsSheet } from '@renderer/components/friends/FriendsSheet'
import { useFriendsSync } from '@renderer/hooks/useFriends'
import { TitleBar } from '@renderer/components/TitleBar'
import { LoginGate } from '@renderer/components/LoginGate'
import { AppAccessGate, useAppAccess } from '@renderer/components/AppAccessGate'
import { TransitionSplash } from '@renderer/components/TransitionSplash'
import { UpdateBanner } from '@renderer/components/UpdateBanner'
import { UpdateScreen } from '@renderer/components/UpdateScreen'
import { HomeScreen } from '@renderer/components/HomeScreen'
import { ToastViewport } from '@renderer/components/notifications/ToastViewport'
import { SettingsPage } from '@renderer/components/settings/SettingsPage'
import { ThemeCursor } from '@renderer/components/ThemeCursor'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useSettingsPage } from '@renderer/contexts/SettingsPageContext'
import { useRealtimePreferences } from '@renderer/hooks/useRealtimePreferences'
import { useNotificationToasts } from '@renderer/hooks/useNotificationToasts'
import { useDesktopNotificationClicks } from '@renderer/hooks/useDesktopNotificationClicks'
import { useRobloxPresence } from '@renderer/hooks/useRobloxPresence'
import { useRealtimeUpdates } from '@renderer/hooks/useRealtimeUpdates'

const TRANSITION_SPLASH_MS = 550
const TRANSITION_FADE_MS = 450

function App(): React.JSX.Element {
  const { status, token } = useAuth()
  const { isOpen: settingsOpen } = useSettingsPage()
  const isAuthenticated = status === 'authenticated'
  const { access, retry: retryAccess } = useAppAccess(isAuthenticated ? token : null)
  const hasAccess = isAuthenticated && access === 'granted'
  const isChecking = status === 'checking'
  useRealtimePreferences()
  useNotificationToasts()
  useFriendsSync()
  const [friendsOpen, setFriendsOpen] = useState(false)
  useDesktopNotificationClicks()
  useRobloxPresence()
  useRealtimeUpdates()
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
      <ThemeCursor />
      <TitleBar
        canOpenSettings={hasAccess}
        friendsOpen={friendsOpen && hasAccess}
        onToggleFriends={() => setFriendsOpen((open) => !open)}
      />

      <div className="relative flex flex-1 overflow-hidden">
        {isChecking ? null : !isAuthenticated ? (
          <LoginGate />
        ) : !hasAccess ? (
          <AppAccessGate access={access} onRetry={retryAccess} />
        ) : !settingsOpen ? (
          <HomeScreen />
        ) : null}
        {showTransitionSplash && <TransitionSplash visible={transitionSplashVisible} />}
        {hasAccess && <SettingsPage />}
        {friendsOpen && hasAccess && (
          <div className="absolute inset-y-0 right-0 z-[1250] flex">
            <FriendsSheet onClose={() => setFriendsOpen(false)} />
          </div>
        )}
        <UpdateScreen />
      </div>
      <ToastViewport />
    </div>
  )
}

export default App
