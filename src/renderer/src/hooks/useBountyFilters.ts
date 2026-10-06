import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEYS = {
  countries: 'bountyTracker.selectedCountries',
  minBounty: 'bountyTracker.minBounty',
  maxBounty: 'bountyTracker.maxBounty'
} as const

export const BOUNTY_RANGE_MAX = 200_000

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

function loadBound(key: string, fallback: number): number {
  const raw = Number(localStorage.getItem(key))
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback
}

export function useBountyFilters(): {
  searchQuery: string
  setSearchQuery: (value: string) => void
  selectedCountries: Set<string>
  toggleCountry: (countryCode: string) => void
  clearCountries: () => void
  minBounty: number
  maxBounty: number
  setBountyRange: (range: [number, number]) => void
} {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(() =>
    loadSet(STORAGE_KEYS.countries)
  )
  const [minBounty, setMinBounty] = useState(() => loadBound(STORAGE_KEYS.minBounty, 0))
  const [maxBounty, setMaxBounty] = useState(() => loadBound(STORAGE_KEYS.maxBounty, BOUNTY_RANGE_MAX))

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.countries, JSON.stringify([...selectedCountries]))
  }, [selectedCountries])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.minBounty, String(minBounty))
  }, [minBounty])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.maxBounty, String(maxBounty))
  }, [maxBounty])

  const toggleCountry = useCallback((countryCode: string) => {
    setSelectedCountries((prev) => {
      const next = new Set(prev)
      if (next.has(countryCode)) next.delete(countryCode)
      else next.add(countryCode)
      return next
    })
  }, [])

  const clearCountries = useCallback(() => setSelectedCountries(new Set()), [])

  const setBountyRange = useCallback(([min, max]: [number, number]) => {
    setMinBounty(min)
    setMaxBounty(max)
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    selectedCountries,
    toggleCountry,
    clearCountries,
    minBounty,
    maxBounty,
    setBountyRange
  }
}
