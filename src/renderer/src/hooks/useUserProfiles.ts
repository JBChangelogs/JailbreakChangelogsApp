import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { usersApi } from '@renderer/lib/usersApi'
import type { UserProfile } from '@shared/user'

export function useUserProfiles(ids: string[]): Map<string, UserProfile> {
  const { token } = useAuth()
  const { presenceOverrides } = useRealtime()
  const [profiles, setProfiles] = useState<Map<string, UserProfile>>(new Map())
  const fetchedRef = useRef<Set<string>>(new Set())

  const key = ids.filter(Boolean).join(',')

  useEffect(() => {
    if (!token || !key) return
    const missing = key.split(',').filter((id) => !fetchedRef.current.has(id))
    if (missing.length === 0) return
    missing.forEach((id) => fetchedRef.current.add(id))

    usersApi
      .getBatch(token, missing)
      .then((users) => {
        setProfiles((prev) => {
          const next = new Map(prev)
          for (const user of users) next.set(user.id, user)
          return next
        })
      })
      .catch(() => {
        missing.forEach((id) => fetchedRef.current.delete(id))
      })
  }, [token, key])

  return useMemo(() => {
    if (presenceOverrides.size === 0) return profiles
    let changed = false
    const next = new Map(profiles)
    for (const [id, presence] of presenceOverrides) {
      const existing = next.get(id)
      if (existing) {
        next.set(id, { ...existing, presence })
        changed = true
      }
    }
    return changed ? next : profiles
  }, [profiles, presenceOverrides])
}
