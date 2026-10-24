import { useMemo, useSyncExternalStore } from 'react'
import { useEmojis } from '@renderer/hooks/useEmojis'

const EMOJI_USAGE_KEY = 'jbcl:emoji-usage'

const listeners = new Set<() => void>()
let usage: Record<string, number> = readUsage()

function readUsage(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(EMOJI_USAGE_KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export function recordEmojiUse(emoji: string): void {
  usage = { ...usage, [emoji]: (usage[emoji] ?? 0) + 1 }
  try {
    localStorage.setItem(EMOJI_USAGE_KEY, JSON.stringify(usage))
  } catch {
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useFrequentEmojis(count: number): string[] {
  const counts = useSyncExternalStore(subscribe, () => usage)
  const emojis = useEmojis()
  return useMemo(
    () =>
      Object.values(emojis)
        .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
        .slice(0, count),
    [emojis, counts, count]
  )
}
