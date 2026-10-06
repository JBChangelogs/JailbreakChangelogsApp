import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import {
  ensureCurrentUserLoaded,
  getCachedCurrentUser,
  subscribeCurrentUser
} from '@renderer/lib/currentUser'
import type { UserProfile } from '@shared/user'

export function useCurrentUser(): { user: UserProfile | null; loading: boolean } {
  const { token } = useAuth()
  const [user, setUser] = useState<UserProfile | null>(getCachedCurrentUser())
  const [loading, setLoading] = useState(!getCachedCurrentUser())

  useEffect(() => subscribeCurrentUser(setUser), [])

  useEffect(() => {
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    if (getCachedCurrentUser()) {
      setLoading(false)
      return
    }
    setLoading(true)
    ensureCurrentUserLoaded(token)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  return { user, loading }
}
