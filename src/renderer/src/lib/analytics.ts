import { useEffect } from 'react'

export type AnalyticsProps = Record<string, string | number | boolean>

export function track(name: string, props?: AnalyticsProps): void {
  window.api.analytics.track(name, props)
}

const SEARCH_SETTLE_MS = 1000

// Records a search once typing settles. Never sends the query text, only its length.
export function useSearchTracking(surface: string, query: string, results: number): void {
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) return
    const timeout = setTimeout(
      () => track('search', { surface, query_len: trimmed.length, results }),
      SEARCH_SETTLE_MS
    )
    return () => clearTimeout(timeout)
  }, [surface, query, results])
}
