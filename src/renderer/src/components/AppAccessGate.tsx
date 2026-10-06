import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { Button } from '@renderer/components/ui/button'
import appIcon from '@renderer/assets/icon.png'

const EXPERIMENTS_URL = 'https://api.jailbreakchangelogs.com/v2/users/me/experiments'

export type AppAccess = 'checking' | 'granted' | 'denied' | 'error'

export function useAppAccess(token: string | null): { access: AppAccess; retry: () => void } {
  const [access, setAccess] = useState<AppAccess>('checking')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!token) {
      setAccess('checking')
      return undefined
    }
    let cancelled = false
    setAccess('checking')
    fetch(EXPERIMENTS_URL, { headers: { Authorization: token } })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        return res.json() as Promise<{ experiments?: Record<string, string> }>
      })
      .then((data) => {
        if (!cancelled) setAccess(data.experiments?.app_available === 'treatment' ? 'granted' : 'denied')
      })
      .catch(() => {
        if (!cancelled) setAccess('error')
      })
    return () => {
      cancelled = true
    }
  }, [token, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { access, retry }
}

export function AppAccessGate({ access, onRetry }: { access: AppAccess; onRetry: () => void }): React.JSX.Element {
  const { logout } = useAuth()

  if (access === 'checking') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
      </div>
    )
  }

  const denied = access === 'denied'

  return (
    <div className="flex h-full w-full items-center justify-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <img src={appIcon} alt="" className="mx-auto h-16 w-16 rounded-full" draggable={false} />
        <h1 className="mt-4 text-xl font-bold text-primary-text">
          {denied ? "You don't have access yet" : "Couldn't check your access"}
        </h1>
        <p className="mt-2 text-sm text-secondary-text">
          {denied
            ? 'The desktop app is still in early access and is only available to some accounts for now.'
            : 'Something went wrong while checking whether your account has access to the app.'}
        </p>
        <div className="mt-6 space-y-2">
          <Button variant="default" size="lg" className="w-full" onClick={onRetry}>
            {denied ? 'Check again' : 'Retry'}
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
