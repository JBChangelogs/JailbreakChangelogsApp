import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { joinHistoryApi, type TrackerType } from '@renderer/lib/joinHistoryApi'

export interface JoinCount {
  markerName: string
  joins: number
  lastJoined: number
}

function sortCounts(counts: JoinCount[]): JoinCount[] {
  return counts.sort((a, b) => b.joins - a.joins || a.markerName.localeCompare(b.markerName))
}

export function useJoinHistory(trackerType: TrackerType): {
  counts: JoinCount[]
  totalJoined: number
  loading: boolean
  addEntry: (markerName: string) => void
} {
  const { token } = useAuth()
  const [counts, setCounts] = useState<JoinCount[]>([])
  const [totalJoined, setTotalJoined] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    joinHistoryApi
      .getJoinCounts(token, trackerType)
      .then((res) => {
        setCounts(
          Object.entries(res.counts).map(([markerName, { joins, last_joined }]) => ({
            markerName,
            joins,
            lastJoined: Math.floor(new Date(last_joined).getTime() / 1000)
          }))
        )
        setTotalJoined(res.total)
      })
      .catch(() => {
      })
      .finally(() => setLoading(false))
  }, [token, trackerType])

  const addEntry = useCallback((markerName: string) => {
    const lastJoined = Math.floor(Date.now() / 1000)
    setCounts((prev) => {
      const existing = prev.find((count) => count.markerName === markerName)
      const others = prev.filter((count) => count.markerName !== markerName)
      return sortCounts([...others, { markerName, joins: (existing?.joins ?? 0) + 1, lastJoined }])
    })
    setTotalJoined((prev) => prev + 1)
  }, [])

  return { counts, totalJoined, loading, addEntry }
}
