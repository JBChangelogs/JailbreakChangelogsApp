import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { useRobberyTrackerWebSocket } from '@renderer/hooks/useRobberyTrackerWebSocket'
import { useRobberyFilters, type ServerSizeFilter, type TimeSort } from '@renderer/hooks/useRobberyFilters'
import { useJoinHistory, type JoinHistoryEntry } from '@renderer/hooks/useJoinHistory'
import type { JoinRosterEntry } from '@renderer/hooks/useTrackerWebSocket'
import { useJoinedJobIds } from '@renderer/hooks/useJoinedJobIds'
import { useServerRegions } from '@renderer/hooks/useServerRegions'
import { useCommonRegions } from '@renderer/hooks/useCommonRegions'
import { getHideJoinedServersEnabled, setHideJoinedServersEnabled } from '@renderer/lib/localPreferences'
import type { RobberyData, ServerRegionData } from '@shared/robbery'

interface RobberyTrackerContextValue {
  robberies: RobberyData[]
  filteredRobberies: RobberyData[]
  isConnecting: boolean
  error: string | undefined
  requiresManualReconnect: boolean
  isBanned: boolean
  banRemainingSeconds: number | null
  reconnect: () => void
  reconnectFromBan: () => void
  selectedTypes: Set<string>
  toggleType: (markerName: string) => void
  clearTypes: () => void
  serverSize: ServerSizeFilter
  setServerSize: (value: ServerSizeFilter) => void
  timeSort: TimeSort
  setTimeSort: (value: TimeSort) => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  selectedCountries: Set<string>
  toggleCountry: (countryCode: string) => void
  clearCountries: () => void
  topCountries: [string, number][]
  joinHistory: JoinHistoryEntry[]
  totalJoined: number
  joinHistoryLoading: boolean
  addJoinHistoryEntry: (entry: Omit<JoinHistoryEntry, 'id' | 'joinedAt'> & { serverId: string }) => void
  getRegionData: (regionId: string) => ServerRegionData | null | undefined
  getRoster: (serverId: string) => JoinRosterEntry[]
  markJoined: (jobId: string) => void
  isJoined: (jobId: string) => boolean
  hideJoinedServers: boolean
  setHideJoinedServers: (hide: boolean) => void
}

const RobberyTrackerContext = createContext<RobberyTrackerContextValue | null>(null)

export function RobberyTrackerProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { user } = useCurrentUser()
  const {
    data: robberies,
    joinRosters,
    send: sendTrackerMessage,
    isConnecting,
    error,
    requiresManualReconnect,
    isBanned,
    banRemainingSeconds,
    reconnect,
    reconnectFromBan,
    checkBanStatus
  } = useRobberyTrackerWebSocket(true, user?.id)

  const filters = useRobberyFilters()
  const { selectedTypes, serverSize, timeSort, searchQuery, selectedCountries } = filters
  const {
    history: joinHistory,
    totalJoined,
    loading: joinHistoryLoading,
    addEntry: addJoinHistoryEntryLocal
  } = useJoinHistory('robbery')
  const { joinedJobIds, markJoined } = useJoinedJobIds('robberyTracker')
  const isJoined = (jobId: string): boolean => joinedJobIds.has(jobId)
  const [hideJoinedServers, setHideJoinedServersState] = useState(getHideJoinedServersEnabled)
  const setHideJoinedServers = (hide: boolean): void => {
    setHideJoinedServersState(hide)
    setHideJoinedServersEnabled(hide)
  }

  const addJoinHistoryEntry = (entry: Omit<JoinHistoryEntry, 'id' | 'joinedAt'> & { serverId: string }): void => {
    addJoinHistoryEntryLocal({ markerName: entry.markerName, displayName: entry.displayName })
    sendTrackerMessage({
      action: 'join_server',
      marker_name: entry.markerName,
      display_name: entry.displayName,
      tracker_type: 'robbery',
      server_id: entry.serverId
    })
  }

  const getRoster = (serverId: string): JoinRosterEntry[] => joinRosters.get(serverId) ?? []

  const commonRegions = useCommonRegions()
  const topCountries = commonRegions?.top_countries ?? []

  const { fetchRegionData } = useServerRegions()
  const [regionMap, setRegionMap] = useState<Map<string, ServerRegionData | null>>(new Map())
  const fetchedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const missingIds = robberies
      .filter((r) => !r.region_data)
      .map((r) => r.region_id || r.server?.job_id || r.job_id)
      .filter((id): id is string => Boolean(id) && !fetchedIdsRef.current.has(id))

    if (missingIds.length === 0) return
    missingIds.forEach((id) => fetchedIdsRef.current.add(id))

    fetchRegionData(missingIds).then((results) => {
      setRegionMap((prev) => {
        const next = new Map(prev)
        for (const [id, data] of Object.entries(results)) next.set(id, data)
        return next
      })
    })
  }, [robberies, fetchRegionData])

  const getRegionData = (regionId: string): ServerRegionData | null | undefined => regionMap.get(regionId)

  const resolveCountry = (robbery: RobberyData): string | null => {
    if (robbery.region_data) return robbery.region_data.countryCode
    const regionId = robbery.region_id || robbery.server?.job_id || robbery.job_id
    return regionId ? (regionMap.get(regionId)?.countryCode ?? null) : null
  }

  useEffect(() => {
    if (isBanned) checkBanStatus()
  }, [isBanned, checkBanStatus])

  const filteredRobberies = useMemo(() => {
    let filtered = robberies.filter((r) => r.status === 1 || r.status === 2)

    if (hideJoinedServers && joinedJobIds.size > 0) {
      filtered = filtered.filter((r) => {
        const jobId = r.server?.job_id || r.job_id
        return !jobId || !joinedJobIds.has(jobId)
      })
    }

    if (serverSize !== 'all') {
      filtered = filtered.filter((r) => {
        const playerCount = r.server?.players?.length ?? 0
        return serverSize === 'big' ? playerCount >= 9 : playerCount < 9
      })
    }

    if (selectedTypes.size > 0) {
      filtered = filtered.filter((r) => selectedTypes.has(r.marker_name))
    }

    if (selectedCountries.size > 0) {
      filtered = filtered.filter((r) => {
        const country = resolveCountry(r)
        return country !== null && selectedCountries.has(country)
      })
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(query))
    }

    return filtered.slice().sort((a, b) => {
      if (a.status !== b.status) return a.status - b.status
      return timeSort === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
    })
  }, [
    robberies,
    serverSize,
    selectedTypes,
    selectedCountries,
    searchQuery,
    timeSort,
    regionMap,
    joinedJobIds,
    hideJoinedServers
  ])

  const value: RobberyTrackerContextValue = {
    robberies,
    filteredRobberies,
    isConnecting,
    error,
    requiresManualReconnect,
    isBanned,
    banRemainingSeconds,
    reconnect,
    reconnectFromBan,
    ...filters,
    topCountries,
    joinHistory,
    totalJoined,
    joinHistoryLoading,
    addJoinHistoryEntry,
    getRegionData,
    getRoster,
    markJoined,
    isJoined,
    hideJoinedServers,
    setHideJoinedServers
  }

  return <RobberyTrackerContext.Provider value={value}>{children}</RobberyTrackerContext.Provider>
}

export function useRobberyTracker(): RobberyTrackerContextValue {
  const ctx = useContext(RobberyTrackerContext)
  if (!ctx) throw new Error('useRobberyTracker must be used within a RobberyTrackerProvider')
  return ctx
}
