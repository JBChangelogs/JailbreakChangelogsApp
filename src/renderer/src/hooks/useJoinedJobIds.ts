import { useCallback, useEffect, useState } from 'react'

const MAX_TRACKED = 200

function load(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useJoinedJobIds(namespace: string): {
  joinedJobIds: Set<string>
  markJoined: (jobId: string) => void
} {
  const storageKey = `${namespace}.joinedJobIds`
  const [joinedJobIds, setJoinedJobIds] = useState<Set<string>>(() => new Set(load(storageKey)))

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...joinedJobIds].slice(-MAX_TRACKED)))
    } catch {
    }
  }, [joinedJobIds, storageKey])

  const markJoined = useCallback((jobId: string) => {
    setJoinedJobIds((prev) => (prev.has(jobId) ? prev : new Set(prev).add(jobId)))
  }, [])

  return { joinedJobIds, markJoined }
}
