import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { refreshCurrentUser } from '@renderer/lib/currentUser'
import { settingsApi } from '@renderer/lib/settingsApi'
import {
  ensureUserSettingsLoaded,
  findUserSetting,
  getCachedUserSettings,
  setCachedUserSetting,
  subscribeUserSettings
} from '@renderer/lib/userSettings'

export function useProfileImageUpload(
  settingName: 'custom_avatar' | 'custom_banner',
  uploadFn: (token: string, blob: Blob) => Promise<string>,
  fetchCustomFn: (token: string) => Promise<string | null>
): {
  enabled: boolean | undefined
  customValue: string | null
  togglePending: boolean
  uploading: boolean
  error: string | null
  pendingImageSrc: string | null
  selectFile: (file: File) => void
  closeCropModal: () => void
  confirmCrop: (blob: Blob) => Promise<void>
  toggle: (next: boolean) => Promise<void>
} {
  const { token } = useAuth()
  const [enabled, setEnabledState] = useState<boolean | undefined>(() => findUserSetting(settingName))
  const [customValue, setCustomValue] = useState<string | null>(null)
  const [togglePending, setTogglePending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null)

  useEffect(() => subscribeUserSettings(() => setEnabledState(findUserSetting(settingName))), [settingName])

  useEffect(() => {
    if (!token || getCachedUserSettings()) return
    ensureUserSettingsLoaded(token).catch(() => {})
  }, [token])

  const fetchedForTokenRef = useRef<string | null>(null)

  useEffect(() => {
    if (!token || fetchedForTokenRef.current === token) return
    fetchedForTokenRef.current = token
    fetchCustomFn(token)
      .then(setCustomValue)
      .catch(() => {
        fetchedForTokenRef.current = null
      })
  }, [token, fetchCustomFn])

  const toggle = async (next: boolean): Promise<void> => {
    if (!token) return
    const previous = enabled
    setCachedUserSetting(settingName, next)
    setTogglePending(true)
    try {
      await settingsApi.updateMine(token, [{ name: settingName, value: next }])
      await refreshCurrentUser(token)
    } catch {
      if (previous !== undefined) setCachedUserSetting(settingName, previous)
    } finally {
      setTogglePending(false)
    }
  }

  const selectFile = (file: File): void => {
    setError(null)
    setPendingImageSrc(URL.createObjectURL(file))
  }

  const closeCropModal = (): void => {
    if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc)
    setPendingImageSrc(null)
  }

  const confirmCrop = async (blob: Blob): Promise<void> => {
    if (!token) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadFn(token, blob)
      setCustomValue(url)
      await settingsApi.updateMine(token, [{ name: settingName, value: true }])
      setCachedUserSetting(settingName, true)
      await refreshCurrentUser(token)
      closeCropModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  return {
    enabled,
    customValue,
    togglePending,
    uploading,
    error,
    pendingImageSrc,
    selectFile,
    closeCropModal,
    confirmCrop,
    toggle
  }
}
