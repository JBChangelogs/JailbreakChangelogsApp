import { useEffect, useState } from 'react'

let cachedIcons: Record<string, string> | null = null
let inFlight: Promise<Record<string, string>> | null = null

function fetchIcons(): Promise<Record<string, string>> {
  if (cachedIcons) return Promise.resolve(cachedIcons)
  if (!inFlight) {
    inFlight = window.api
      .robloxGameIcons()
      .then((result) => {
        const icons = result ?? {}
        if (Object.keys(icons).length > 0) cachedIcons = icons
        else inFlight = null
        return icons
      })
      .catch(() => {
        inFlight = null
        return {}
      })
  }
  return inFlight
}

export function useRobloxGameIcons(): Record<string, string> {
  const [icons, setIcons] = useState<Record<string, string>>(cachedIcons ?? {})

  useEffect(() => {
    if (cachedIcons) return
    void fetchIcons().then(setIcons)
  }, [])

  return icons
}
