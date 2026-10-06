import { useEffect, useState } from 'react'

const COMMON_REGIONS_URL = 'https://inventories.jailbreakchangelogs.com/servers/regions/common'

export interface CommonRegionsStats {
  total_servers: number
  top_countries: [string, number][]
  top_regions: [string, number][]
  top_cities: [string, number][]
}

let cache: CommonRegionsStats | null = null
let inFlight: Promise<CommonRegionsStats | null> | null = null

function fetchCommonRegions(): Promise<CommonRegionsStats | null> {
  if (cache) return Promise.resolve(cache)
  if (!inFlight) {
    inFlight = fetch(COMMON_REGIONS_URL)
      .then((res) => (res.ok ? (res.json() as Promise<CommonRegionsStats>) : null))
      .then((data) => {
        cache = data
        return data
      })
      .catch((err: unknown) => {
        console.error('[common-regions] failed to load', err)
        return null
      })
  }
  return inFlight
}

export function useCommonRegions(): CommonRegionsStats | null {
  const [data, setData] = useState<CommonRegionsStats | null>(cache)

  useEffect(() => {
    if (cache) return
    fetchCommonRegions().then(setData)
  }, [])

  return data
}
