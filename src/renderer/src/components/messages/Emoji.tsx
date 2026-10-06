import { usePreferences } from '@renderer/contexts/PreferencesContext'

const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.0.3/assets/svg/'

function toCodePoints(emoji: string): string {
  return Array.from(emoji)
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter((hex): hex is string => Boolean(hex) && hex !== 'fe0f')
    .join('-')
}

export function Emoji({ emoji, className }: { emoji: string; className?: string }): React.JSX.Element {
  const { twemojiEnabled } = usePreferences()
  if (!twemojiEnabled) return <>{emoji}</>

  return (
    <img
      className={`twemoji ${className ?? ''}`}
      src={`${TWEMOJI_BASE}${toCodePoints(emoji)}.svg`}
      alt={emoji}
      draggable={false}
    />
  )
}

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
const EMOJI_PATTERN = /\p{Extended_Pictographic}/u

function splitEmoji(text: string): Array<{ emoji: boolean; value: string }> {
  const segments: Array<{ emoji: boolean; value: string }> = []
  for (const { segment } of segmenter.segment(text)) {
    const isEmoji = EMOJI_PATTERN.test(segment)
    const last = segments[segments.length - 1]
    if (!isEmoji && last && !last.emoji) {
      last.value += segment
    } else {
      segments.push({ emoji: isEmoji, value: segment })
    }
  }
  return segments
}

export function EmojiText({ text }: { text: string }): React.JSX.Element {
  const { twemojiEnabled } = usePreferences()
  if (!twemojiEnabled) return <>{text}</>

  return (
    <>
      {splitEmoji(text).map((segment, index) =>
        segment.emoji ? (
          <Emoji key={index} emoji={segment.value} />
        ) : (
          <span key={index}>{segment.value}</span>
        )
      )}
    </>
  )
}
