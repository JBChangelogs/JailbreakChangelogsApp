import { useCallback, useRef } from 'react'
import type { ServerRegionData } from '@shared/robbery'

const INVENTORY_API_URL = 'https://inventories.jailbreakchangelogs.com'

export function useServerRegions(): {
  fetchRegionData: (regionIds: string[]) => Promise<Record<string, ServerRegionData | null>>
} {
  const fetchingRef = useRef<Set<string>>(new Set())

  const fetchRegionData = useCallback(
    async (regionIds: string[]): Promise<Record<string, ServerRegionData | null>> => {
      const validIds = regionIds.filter(Boolean)
      if (validIds.length === 0) return {}

      const alreadyFetching = validIds.filter((id) => fetchingRef.current.has(id))
      if (alreadyFetching.length > 0) {
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            const stillFetching = alreadyFetching.some((id) => fetchingRef.current.has(id))
            if (!stillFetching) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 50)
        })
      }

      try {
        validIds.forEach((id) => fetchingRef.current.add(id))

        const batchSize = 100
        const batches: string[][] = []
        for (let i = 0; i < validIds.length; i += batchSize) {
          batches.push(validIds.slice(i, i + batchSize))
        }

        const allResults: Record<string, ServerRegionData | null> = {}

        for (const batch of batches) {
          const idsParam = batch.map(encodeURIComponent).join(',')
          try {
            const response = await fetch(`${INVENTORY_API_URL}/servers/regions?ids=${idsParam}`)
            if (!response.ok) {
              batch.forEach((id) => {
                allResults[id] = null
              })
              continue
            }
            const data = (await response.json()) as Record<string, ServerRegionData | null>
            Object.assign(allResults, data)
          } catch (err) {
            console.error('[region fetch] request failed', err)
            batch.forEach((id) => {
              allResults[id] = null
            })
          }
        }

        return allResults
      } finally {
        validIds.forEach((id) => fetchingRef.current.delete(id))
      }
    },
    []
  )

  return { fetchRegionData }
}
