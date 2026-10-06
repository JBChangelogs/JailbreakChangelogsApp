import { messagesApi } from '@renderer/lib/messagesApi'

let cached: string[] | null = null
let inflight: Promise<string[]> | null = null
const listeners = new Set<(ids: string[] | null) => void>()

function notify(): void {
  for (const listener of listeners) listener(cached)
}

export function subscribeBlockedUsers(listener: (ids: string[] | null) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCachedBlockedUsers(): string[] | null {
  return cached
}

export function ensureBlockedUsersLoaded(token: string): Promise<string[]> {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = messagesApi
      .listBlockedUsers(token)
      .then((ids) => {
        cached = ids
        inflight = null
        notify()
        return ids
      })
      .catch((err: unknown) => {
        inflight = null
        throw err
      })
  }
  return inflight
}

export function addBlockedUser(id: string): void {
  cached = cached ? (cached.includes(id) ? cached : [...cached, id]) : [id]
  notify()
}

export function removeBlockedUser(id: string): void {
  if (!cached) return
  cached = cached.filter((existing) => existing !== id)
  notify()
}
