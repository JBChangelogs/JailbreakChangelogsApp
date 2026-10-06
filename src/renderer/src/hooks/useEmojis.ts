import { useEffect, useState } from 'react'

let cachedEmojis: Record<string, string> | null = null
let inFlight: Promise<Record<string, string>> | null = null

async function fetchEmojis(): Promise<Record<string, string>> {
  if (cachedEmojis) return cachedEmojis
  if (!inFlight) {
    inFlight = fetch('https://api.jailbreakchangelogs.com/v2/emojis/string')
      .then((res) => res.json())
      .then((data: { emojis?: Record<string, string> }) => {
        cachedEmojis = data.emojis ?? {}
        return cachedEmojis
      })
      .catch(() => {
        inFlight = null
        return {}
      })
  }
  return inFlight
}

export function useEmojis(): Record<string, string> {
  const [emojis, setEmojis] = useState<Record<string, string>>(cachedEmojis ?? {})

  useEffect(() => {
    if (cachedEmojis) return
    fetchEmojis().then(setEmojis)
  }, [])

  return emojis
}
