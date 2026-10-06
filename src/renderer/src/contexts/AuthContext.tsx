import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { onUnauthorized } from '@renderer/lib/authEvents'

type AuthStatus = 'checking' | 'idle' | 'waiting' | 'authenticated' | 'error'

interface AuthContextValue {
  status: AuthStatus
  token: string | null
  error: string | null
  login: () => void
  cancelLogin: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const LOGIN_TIMEOUT_MS = 3 * 60 * 1000

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLoginTimeout = (): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  useEffect(() => {
    window.api.auth.getToken().then((stored) => {
      if (stored) {
        setToken(stored)
        setStatus('authenticated')
      } else {
        setStatus('idle')
      }
    })
  }, [])

  useEffect(() => {
    const offSuccess = window.api.auth.onLoginSuccess((t) => {
      clearLoginTimeout()
      setToken(t)
      setError(null)
      setStatus('authenticated')
    })
    const offError = window.api.auth.onLoginError((e) => {
      clearLoginTimeout()
      setError(e)
      setStatus('error')
    })
    return () => {
      offSuccess()
      offError()
    }
  }, [])

  useEffect(() => clearLoginTimeout, [])

  useEffect(() => {
    return onUnauthorized(() => {
      window.api.auth.logout()
      setToken(null)
      setStatus('error')
      setError('Your session expired - please sign in again.')
    })
  }, [])

  const login = (): void => {
    setError(null)
    setStatus('waiting')
    window.api.auth.login()
    clearLoginTimeout()
    timeoutRef.current = setTimeout(() => {
      setStatus('error')
      setError('Login timed out - the browser may have been closed before finishing.')
    }, LOGIN_TIMEOUT_MS)
  }

  const cancelLogin = (): void => {
    clearLoginTimeout()
    setStatus('idle')
    setError(null)
  }

  const logout = (): void => {
    window.api.auth.logout()
    setToken(null)
    setStatus('idle')
  }

  return (
    <AuthContext.Provider value={{ status, token, error, login, cancelLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
