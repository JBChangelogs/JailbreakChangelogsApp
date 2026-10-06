import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { notificationsApi } from '@renderer/lib/notificationsApi'
import { NOTIFICATION_PREFERENCE_DEFAULT } from '@shared/notification'

export function useNotificationPreferences(): {
  isEnabled: (category: string) => boolean
  setCategories: (categories: string[], next: boolean) => Promise<void>
  loading: boolean
  error: string | null
  pending: Set<string>
} {
  const { token } = useAuth()
  const { user } = useCurrentUser()
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.id || !token) return
    setLoading(true)
    setError(null)
    notificationsApi
      .getPreferences(user.id)
      .then((res) => setOverrides(new Map(res.preferences.map((p) => [p.title, Boolean(p.enabled)]))))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Failed to load notification preferences')
      )
      .finally(() => setLoading(false))
  }, [user?.id, token])

  const isEnabled = (category: string): boolean => overrides.get(category) ?? NOTIFICATION_PREFERENCE_DEFAULT

  const setCategories = async (categories: string[], next: boolean): Promise<void> => {
    if (!token || categories.length === 0) return
    const previous = new Map(categories.map((c) => [c, overrides.get(c)]))
    setOverrides((prev) => {
      const updated = new Map(prev)
      categories.forEach((c) => updated.set(c, next))
      return updated
    })
    setPending((prev) => new Set([...prev, ...categories]))
    setError(null)
    try {
      await notificationsApi.updatePreferences(
        token,
        categories.map((title) => ({ title, enabled: next }))
      )
    } catch (err) {
      setOverrides((prev) => {
        const reverted = new Map(prev)
        previous.forEach((value, c) => (value === undefined ? reverted.delete(c) : reverted.set(c, value)))
        return reverted
      })
      setError(err instanceof Error ? err.message : 'Failed to update notification preference')
    } finally {
      setPending((prev) => {
        const nextSet = new Set(prev)
        categories.forEach((c) => nextSet.delete(c))
        return nextSet
      })
    }
  }

  return { isEnabled, setCategories, loading, error, pending }
}
