import { usersApi } from '@renderer/lib/usersApi'
import type { UserProfile } from '@shared/user'

let cached: UserProfile | null = null
let inflight: Promise<UserProfile> | null = null
const listeners = new Set<(user: UserProfile | null) => void>()

function notify(): void {
  for (const listener of listeners) listener(cached)
}

export function subscribeCurrentUser(listener: (user: UserProfile | null) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCachedCurrentUser(): UserProfile | null {
  return cached
}

export function ensureCurrentUserLoaded(token: string): Promise<UserProfile> {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = usersApi
      .me(token)
      .then((data) => {
        cached = data
        inflight = null
        notify()
        return data
      })
      .catch((err: unknown) => {
        inflight = null
        throw err
      })
  }
  return inflight
}

export function refreshCurrentUser(token: string): Promise<UserProfile> {
  inflight = usersApi.me(token).then((data) => {
    cached = data
    inflight = null
    notify()
    return data
  })
  return inflight
}

export function setCachedCurrentUser(user: UserProfile): void {
  cached = user
  notify()
}
