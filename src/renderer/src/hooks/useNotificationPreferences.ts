import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { notificationsApi } from '@renderer/lib/notificationsApi'
import { NOTIFICATION_PREFERENCE_DEFAULT } from '@shared/notification'

export function useNotificationPreferences(): {
  isEnabled: (category: string) => boolean
  toggleCategory: (category: string, next: boolean) => Promise<void>
  emailEnabled: boolean
  toggleEmail: (next: boolean) => Promise<void>
  loading: boolean
  error: string | null
  emailError: string | null
  pending: Set<string>
} {
  const { token } = useAuth()
  const { user } = useCurrentUser()
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map())
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [pending, setPending] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.id || !token) return
    setLoading(true)
    setError(null)
    Promise.allSettled([notificationsApi.getPreferences(user.id), notificationsApi.getEmailPreference(token)])
      .then(([prefsResult, emailResult]) => {
        if (prefsResult.status === 'fulfilled') {
          setOverrides(new Map(prefsResult.value.preferences.map((p) => [p.title, Boolean(p.enabled)])))
        }
        if (emailResult.status === 'fulfilled') {
          setEmailEnabled(emailResult.value)
        }
        const failure = prefsResult.status === 'rejected' ? prefsResult.reason : emailResult.status === 'rejected' ? emailResult.reason : null
        if (failure) {
          setError(failure instanceof Error ? failure.message : 'Failed to load notification preferences')
        }
      })
      .finally(() => setLoading(false))
  }, [user?.id, token])

  const isEnabled = (category: string): boolean => overrides.get(category) ?? NOTIFICATION_PREFERENCE_DEFAULT

  const toggleCategory = async (category: string, next: boolean): Promise<void> => {
    if (!token) return
    const previous = overrides.get(category)
    setOverrides((prev) => new Map(prev).set(category, next))
    setPending((prev) => new Set(prev).add(category))
    setError(null)
    try {
      await notificationsApi.updatePreferences(token, [{ title: category, enabled: next }])
    } catch (err) {
      setOverrides((prev) => {
        const reverted = new Map(prev)
        if (previous === undefined) reverted.delete(category)
        else reverted.set(category, previous)
        return reverted
      })
      setError(err instanceof Error ? err.message : 'Failed to update notification preference')
    } finally {
      setPending((prev) => {
        const nextSet = new Set(prev)
        nextSet.delete(category)
        return nextSet
      })
    }
  }

  const toggleEmail = async (next: boolean): Promise<void> => {
    if (!token) return
    const previous = emailEnabled
    setEmailEnabled(next)
    setPending((prev) => new Set(prev).add('__email'))
    setEmailError(null)
    try {
      await notificationsApi.setEmailPreference(token, next)
    } catch (err) {
      setEmailEnabled(previous)
      setEmailError(err instanceof Error ? err.message : 'Failed to update email notification preference')
    } finally {
      setPending((prev) => {
        const nextSet = new Set(prev)
        nextSet.delete('__email')
        return nextSet
      })
    }
  }

  return { isEnabled, toggleCategory, emailEnabled, toggleEmail, loading, error, emailError, pending }
}
