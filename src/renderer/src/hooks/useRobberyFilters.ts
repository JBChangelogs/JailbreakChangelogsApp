import { useCallback, useEffect, useState } from 'react'

export type ServerSizeFilter = 'all' | 'big' | 'small'
export type TimeSort = 'newest' | 'oldest'

const STORAGE_KEYS = {
  types: 'robberyTracker.selectedTypes',
  serverSize: 'robberyTracker.serverSize',
  timeSort: 'robberyTracker.timeSort',
  countries: 'robberyTracker.selectedCountries'
} as const

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed) : new Set()
  } catch {
    return new Set()
  }
}

function loadServerSize(): ServerSizeFilter {
  const raw = localStorage.getItem(STORAGE_KEYS.serverSize)
  return raw === 'big' || raw === 'small' ? raw : 'all'
}

function loadTimeSort(): TimeSort {
  return localStorage.getItem(STORAGE_KEYS.timeSort) === 'oldest' ? 'oldest' : 'newest'
}

export function useRobberyFilters(): {
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
} {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(() => loadSet(STORAGE_KEYS.types))
  const [serverSize, setServerSize] = useState<ServerSizeFilter>(loadServerSize)
  const [timeSort, setTimeSort] = useState<TimeSort>(loadTimeSort)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(() => loadSet(STORAGE_KEYS.countries))

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.types, JSON.stringify([...selectedTypes]))
  }, [selectedTypes])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.serverSize, serverSize)
  }, [serverSize])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.timeSort, timeSort)
  }, [timeSort])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.countries, JSON.stringify([...selectedCountries]))
  }, [selectedCountries])

  const toggleType = useCallback((markerName: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(markerName)) next.delete(markerName)
      else next.add(markerName)
      return next
    })
  }, [])

  const clearTypes = useCallback(() => setSelectedTypes(new Set()), [])

  const toggleCountry = useCallback((countryCode: string) => {
    setSelectedCountries((prev) => {
      const next = new Set(prev)
      if (next.has(countryCode)) next.delete(countryCode)
      else next.add(countryCode)
      return next
    })
  }, [])

  const clearCountries = useCallback(() => setSelectedCountries(new Set()), [])

  return {
    selectedTypes,
    toggleType,
    clearTypes,
    serverSize,
    setServerSize,
    timeSort,
    setTimeSort,
    searchQuery,
    setSearchQuery,
    selectedCountries,
    toggleCountry,
    clearCountries
  }
}
