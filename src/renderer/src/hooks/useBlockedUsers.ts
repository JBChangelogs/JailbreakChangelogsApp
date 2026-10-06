import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { messagesApi } from '@renderer/lib/messagesApi'
import {
  addBlockedUser,
  removeBlockedUser,
  ensureBlockedUsersLoaded,
  getCachedBlockedUsers,
  subscribeBlockedUsers
} from '@renderer/lib/blockedUsers'

export function useBlockedUsers(): {
  blockedIds: string[] | null
  loading: boolean
  isBlocked: (userId: string) => boolean
  block: (userId: string) => Promise<void>
  unblock: (userId: string) => Promise<void>
} {
  const { token } = useAuth()
  const [blockedIds, setBlockedIds] = useState<string[] | null>(getCachedBlockedUsers())
  const [loading, setLoading] = useState(false)

  useEffect(() => subscribeBlockedUsers(setBlockedIds), [])

  useEffect(() => {
    if (!token || getCachedBlockedUsers()) return
    setLoading(true)
    ensureBlockedUsersLoaded(token)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const isBlocked = (userId: string): boolean => Boolean(blockedIds?.includes(userId))

  const block = async (userId: string): Promise<void> => {
    if (!token) return
    addBlockedUser(userId)
    try {
      await messagesApi.blockUser(token, userId)
    } catch (err) {
      removeBlockedUser(userId)
      throw err
    }
  }

  const unblock = async (userId: string): Promise<void> => {
    if (!token) return
    removeBlockedUser(userId)
    try {
      await messagesApi.unblockUser(token, userId)
    } catch (err) {
      addBlockedUser(userId)
      throw err
    }
  }

  return { blockedIds, loading, isBlocked, block, unblock }
}
