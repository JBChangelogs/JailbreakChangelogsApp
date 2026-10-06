export interface OwnRobloxActivity {
  placeId: string | null
  jobId: string | null
}

let current: OwnRobloxActivity = { placeId: null, jobId: null }
const listeners = new Set<(activity: OwnRobloxActivity) => void>()

export function setOwnRobloxActivity(placeId: string | null, jobId: string | null): void {
  current = { placeId, jobId }
  for (const listener of listeners) listener(current)
}

export function getOwnRobloxActivity(): OwnRobloxActivity {
  return current
}

export function subscribeOwnRobloxActivity(listener: (activity: OwnRobloxActivity) => void): () => void {
  listeners.add(listener)
  listener(current)
  return () => {
    listeners.delete(listener)
  }
}
