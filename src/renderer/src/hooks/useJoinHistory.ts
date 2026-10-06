import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { joinHistoryApi, type JoinHistoryApiItem, type TrackerType } from '@renderer/lib/joinHistoryApi'

export interface JoinHistoryEntry {
  id: string
  markerName: string
  displayName: string
  joinedAt: number
}

const MAX_ENTRIES = 50

function toEntry(item: JoinHistoryApiItem): JoinHistoryEntry {
  return {
    id: `${item.timestamp}-${item.marker_name}`,
    markerName: item.marker_name,
    displayName: item.display_name,
    joinedAt: Math.floor(new Date(item.timestamp).getTime() / 1000)
  }
}

export function useJoinHistory(trackerType: TrackerType): {
  history: JoinHistoryEntry[]
  totalJoined: number
  loading: boolean
  addEntry: (entry: Omit<JoinHistoryEntry, 'id' | 'joinedAt'>) => void
} {
  const { token } = useAuth()
  const [history, setHistory] = useState<JoinHistoryEntry[]>([])
  const [totalJoined, setTotalJoined] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    joinHistoryApi
      .getJoinHistory(token, trackerType, 1)
      .then((res) => {
        setHistory(res.items.map(toEntry))
        setTotalJoined(res.total)
      })
      .catch(() => {
      })
      .finally(() => setLoading(false))
  }, [token, trackerType])

  const addEntry = useCallback((entry: Omit<JoinHistoryEntry, 'id' | 'joinedAt'>) => {
    const joinedAt = Math.floor(Date.now() / 1000)
    setHistory((prev) => [{ ...entry, id: crypto.randomUUID(), joinedAt }, ...prev].slice(0, MAX_ENTRIES))
    setTotalJoined((prev) => prev + 1)
  }, [])

  return { history, totalJoined, loading, addEntry }
}
