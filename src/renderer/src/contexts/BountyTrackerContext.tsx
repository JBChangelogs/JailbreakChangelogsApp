import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { useBountyAlerts } from '@renderer/lib/trackerAlerts'
import { useBountyTrackerWebSocket } from '@renderer/hooks/useBountyTrackerWebSocket'
import { useBountyFilters } from '@renderer/hooks/useBountyFilters'
import { useJoinHistory, type JoinHistoryEntry } from '@renderer/hooks/useJoinHistory'
import type { JoinRosterEntry } from '@renderer/hooks/useTrackerWebSocket'
import { useJoinedJobIds } from '@renderer/hooks/useJoinedJobIds'
import { useServerRegions } from '@renderer/hooks/useServerRegions'
import { useCommonRegions } from '@renderer/hooks/useCommonRegions'
import { getHideJoinedServersEnabled, setHideJoinedServersEnabled } from '@renderer/lib/localPreferences'
import type { BountyData } from '@shared/bounty'
import type { ServerRegionData } from '@shared/robbery'

export interface BountyServerGroup {
  serverId: string
  bounties: BountyData[]
  totalBounty: number
  highestIndividualBounty: number
  lastUpdated: number
}

interface BountyTrackerContextValue {
  serverGroups: BountyServerGroup[]
  isConnecting: boolean
  error: string | undefined
  requiresManualReconnect: boolean
  isBanned: boolean
  banRemainingSeconds: number | null
  reconnect: () => void
  reconnectFromBan: () => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  selectedCountries: Set<string>
  toggleCountry: (countryCode: string) => void
  clearCountries: () => void
  topCountries: [string, number][]
  minBounty: number
  maxBounty: number
  setBountyRange: (range: [number, number]) => void
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

const BountyTrackerContext = createContext<BountyTrackerContextValue | null>(null)

export function BountyTrackerProvider({
  children,
  enabled,
  onAlertClick
}: {
  children: React.ReactNode
  enabled: boolean
  onAlertClick: () => void
}): React.JSX.Element {
  const { user } = useCurrentUser()
  const {
    data: bounties,
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
  } = useBountyTrackerWebSocket(enabled, user?.id)
  useBountyAlerts(bounties, onAlertClick)

  const {
    searchQuery,
    setSearchQuery,
    selectedCountries,
    toggleCountry,
    clearCountries,
    minBounty,
    maxBounty,
    setBountyRange
  } = useBountyFilters()

  const {
    history: joinHistory,
    totalJoined,
    loading: joinHistoryLoading,
    addEntry: addJoinHistoryEntryLocal
  } = useJoinHistory('bounty')
  const { joinedJobIds, markJoined } = useJoinedJobIds('bountyTracker')
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
      tracker_type: 'bounty',
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
    const missingIds = bounties
      .map((b) => b.server?.job_id)
      .filter((id): id is string => Boolean(id && !fetchedIdsRef.current.has(id)))

    if (missingIds.length === 0) return
    missingIds.forEach((id) => fetchedIdsRef.current.add(id))

    fetchRegionData(missingIds).then((results) => {
      setRegionMap((prev) => {
        const next = new Map(prev)
        for (const [id, data] of Object.entries(results)) next.set(id, data)
        return next
      })
    })
  }, [bounties, fetchRegionData])

  const getRegionData = (regionId: string): ServerRegionData | null | undefined => regionMap.get(regionId)

  const resolveCountry = (bounty: BountyData): string | null => {
    const jobId = bounty.server?.job_id
    return jobId ? (regionMap.get(jobId)?.countryCode ?? null) : null
  }

  useEffect(() => {
    if (isBanned) checkBanStatus()
  }, [isBanned, checkBanStatus])

  const serverGroups = useMemo(() => {
    let filtered = bounties

    if (hideJoinedServers && joinedJobIds.size > 0) {
      filtered = filtered.filter((b) => {
        const jobId = b.server?.job_id
        return !jobId || !joinedJobIds.has(jobId)
      })
    }

    if (selectedCountries.size > 0) {
      filtered = filtered.filter((b) => {
        const country = resolveCountry(b)
        return country !== null && selectedCountries.has(country)
      })
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.display_name.toLowerCase().includes(query) ||
          String(b.userid).includes(query) ||
          b.inventory.some((item) => item.toLowerCase().includes(query))
      )
    }

    const groups = new Map<string, BountyData[]>()
    for (const bounty of filtered) {
      const serverId = bounty.server?.job_id
      if (!serverId) continue
      if (!groups.has(serverId)) groups.set(serverId, [])
      groups.get(serverId)!.push(bounty)
    }

    return Array.from(groups.entries())
      .map(([serverId, serverBounties]) => ({
        serverId,
        bounties: serverBounties.slice().sort((a, b) => b.bounty - a.bounty),
        totalBounty: serverBounties.reduce((sum, b) => sum + b.bounty, 0),
        highestIndividualBounty: Math.max(...serverBounties.map((b) => b.bounty)),
        lastUpdated: Math.max(...serverBounties.map((b) => b.timestamp))
      }))
      .filter(
        (group) =>
          (minBounty === 0 && maxBounty === 0) ||
          (group.totalBounty >= minBounty && group.totalBounty <= maxBounty)
      )
      .sort((a, b) => b.lastUpdated - a.lastUpdated)
  }, [bounties, selectedCountries, searchQuery, minBounty, maxBounty, regionMap, joinedJobIds, hideJoinedServers])

  const value: BountyTrackerContextValue = {
    serverGroups,
    isConnecting,
    error,
    requiresManualReconnect,
    isBanned,
    banRemainingSeconds,
    reconnect,
    reconnectFromBan,
    searchQuery,
    setSearchQuery,
    selectedCountries,
    toggleCountry,
    clearCountries,
    topCountries,
    minBounty,
    maxBounty,
    setBountyRange,
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

  return <BountyTrackerContext.Provider value={value}>{children}</BountyTrackerContext.Provider>
}

export function useBountyTracker(): BountyTrackerContextValue {
  const ctx = useContext(BountyTrackerContext)
  if (!ctx) throw new Error('useBountyTracker must be used within a BountyTrackerProvider')
  return ctx
}
