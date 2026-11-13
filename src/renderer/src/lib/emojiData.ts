import type { Emoji, ShortcodesDataset } from 'emojibase'

export interface EmojiEntry {
  emoji: string
  label: string
  names: string[]
  tags: string[]
  skins: Array<string | undefined> | null
}

export interface EmojiGroup {
  key: string
  label: string
  icon: string
  emojis: EmojiEntry[]
}

export interface EmojiData {
  groups: EmojiGroup[]
  byName: Record<string, string>
  byEmoji: Map<string, EmojiEntry>
}

const GROUPS: Array<[number, string, string, string]> = [
  [0, 'smileys', 'Smileys & Emotion', '😀'],
  [1, 'people', 'People & Body', '👋'],
  [3, 'nature', 'Animals & Nature', '🐱'],
  [4, 'food', 'Food & Drink', '🍎'],
  [5, 'travel', 'Travel & Places', '🚗'],
  [6, 'activities', 'Activities', '⚽'],
  [7, 'objects', 'Objects', '💡'],
  [8, 'symbols', 'Symbols', '💗'],
  [9, 'flags', 'Flags', '🏁']
]

const MAX_VERSION = 17

function build(all: Emoji[], codes: ShortcodesDataset): EmojiData {
  const namesOf = (hex: string): string[] => {
    const value = codes[hex]
    return value ? (Array.isArray(value) ? value : [value]) : []
  }
  const byName: Record<string, string> = {}
  const byEmoji = new Map<string, EmojiEntry>()
  const groups = GROUPS.map(([id, key, label, icon]) => {
    const emojis = all
      .filter((e) => e.group === id && e.version <= MAX_VERSION)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((e): EmojiEntry => {
        const names = namesOf(e.hexcode)
        const entry: EmojiEntry = {
          emoji: e.emoji,
          label: e.label,
          names: names.length ? names : [e.label.toLowerCase().replace(/[^a-z0-9]+/g, '_')],
          tags: e.tags ?? [],
          skins: e.skins
            ? [1, 2, 3, 4, 5].map((tone) => e.skins!.find((s) => [s.tone].flat().every((t) => t === tone))?.emoji)
            : null
        }
        for (const name of entry.names) byName[name] = e.emoji
        for (const skin of e.skins ?? []) {
          for (const name of namesOf(skin.hexcode)) byName[name] = skin.emoji
          byEmoji.set(skin.emoji, entry)
        }
        byEmoji.set(e.emoji, entry)
        return entry
      })
    return { key, label, icon, emojis }
  })
  return { groups, byName, byEmoji }
}

let loading: Promise<EmojiData> | null = null
export let emojiData: EmojiData | null = null

export function loadEmojiData(): Promise<EmojiData> {
  loading ??= Promise.all([
    import('emojibase-data/en/data.json'),
    import('emojibase-data/en/shortcodes/joypixels.json')
  ]).then(
    ([compact, codes]) => (emojiData = build(compact.default, codes.default)),
    (error) => {
      loading = null
      throw error
    }
  )
  return loading
}

export function searchEmojis(data: EmojiData, query: string): EmojiEntry[] {
  const q = query.trim().toLowerCase().replace(/^:|:$/g, '').replace(/\s+/g, '_')
  if (!q) return []
  const scored: Array<[number, EmojiEntry]> = []
  for (const group of data.groups) {
    for (const entry of group.emojis) {
      const score = entry.names.some((n) => n.startsWith(q))
        ? 0
        : entry.names.some((n) => n.includes(q)) || entry.label.replace(/ /g, '_').includes(q)
          ? 1
          : entry.tags.some((t) => t.startsWith(q))
            ? 2
            : -1
      if (score >= 0) scored.push([score, entry])
    }
  }
  return scored.sort((a, b) => a[0] - b[0]).map(([, entry]) => entry)
}
