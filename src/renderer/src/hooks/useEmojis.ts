import { useEffect, useState } from 'react'
import { emojiData, loadEmojiData, type EmojiData } from '@renderer/lib/emojiData'

export function useEmojiData(): EmojiData | null {
  const [data, setData] = useState(emojiData)

  useEffect(() => {
    if (!data) loadEmojiData().then(setData, () => {})
  }, [data])

  return data
}

const EMPTY: Record<string, string> = {}

export function useEmojis(): Record<string, string> {
  return useEmojiData()?.byName ?? EMPTY
}
