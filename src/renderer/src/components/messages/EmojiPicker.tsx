import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { Emoji } from '@renderer/components/messages/Emoji'
import { useEmojiData } from '@renderer/hooks/useEmojis'
import { recordEmojiUse, useFrequentEmojis } from '@renderer/hooks/useFrequentEmojis'
import { searchEmojis, type EmojiEntry } from '@renderer/lib/emojiData'

export function EmojiIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0M9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75S9.168 9 9.375 9s.375.336.375.75m-.375 0h.008v.015h-.008zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75s.168-.75.375-.75s.375.336.375.75m-.375 0h.008v.015h-.008z"
      />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
    </svg>
  )
}

const SKIN_TONE_KEY = 'jbcl:emoji-skin-tone'
const TONE_SAMPLES = ['👏', '👏🏻', '👏🏼', '👏🏽', '👏🏾', '👏🏿']
const toneListeners = new Set<() => void>()
let skinTone = Number(readTone()) || 0

function readTone(): string | null {
  try {
    return localStorage.getItem(SKIN_TONE_KEY)
  } catch {
    return null
  }
}

function setSkinTone(tone: number): void {
  skinTone = tone
  try {
    localStorage.setItem(SKIN_TONE_KEY, String(tone))
  } catch {
  }
  toneListeners.forEach((listener) => listener())
}

function useSkinTone(): number {
  return useSyncExternalStore(
    (listener) => {
      toneListeners.add(listener)
      return () => toneListeners.delete(listener)
    },
    () => skinTone
  )
}

const withTone = (entry: EmojiEntry, tone: number): string => (tone && entry.skins?.[tone - 1]) || entry.emoji

interface Section {
  key: string
  label: string
  icon: React.ReactNode
  emojis: Array<{ emoji: string; entry: EmojiEntry | undefined }>
}

export function EmojiPanel({ onSelect }: { onSelect: (emoji: string) => void }): React.JSX.Element {
  const data = useEmojiData()
  const frequent = useFrequentEmojis(18)
  const tone = useSkinTone()
  const [query, setQuery] = useState('')
  const [hovered, setHovered] = useState<{ emoji: string; entry: EmojiEntry | undefined } | null>(null)
  const [toneOpen, setToneOpen] = useState(false)
  const [active, setActive] = useState('frequent')
  const scrollRef = useRef<HTMLDivElement>(null)

  const sections = useMemo((): Section[] => {
    if (!data) return []
    if (query.trim()) {
      const results = searchEmojis(data, query)
      return [
        {
          key: 'search',
          label: results.length ? 'Search results' : 'No emoji match that search',
          icon: null,
          emojis: results.map((entry) => ({ emoji: withTone(entry, tone), entry }))
        }
      ]
    }
    return [
      {
        key: 'frequent',
        label: 'Frequently Used',
        icon: <ClockIcon className="h-5 w-5" />,
        emojis: frequent.map((emoji) => ({ emoji, entry: data.byEmoji.get(emoji) }))
      },
      ...data.groups.map((group) => ({
        key: group.key,
        label: group.label,
        icon: <Emoji emoji={group.icon} />,
        emojis: group.emojis.map((entry) => ({ emoji: withTone(entry, tone), entry }))
      }))
    ]
  }, [data, query, frequent, tone])

  const pick = onSelect

  const jumpTo = (key: string): void => {
    const node = scrollRef.current?.querySelector<HTMLElement>(`[data-section="${key}"]`)
    if (node && scrollRef.current) scrollRef.current.scrollTop = node.offsetTop
    setActive(key)
  }

  const onScroll = (): void => {
    const container = scrollRef.current
    if (!container || query.trim()) return
    let current = sections[0]?.key
    for (const node of container.querySelectorAll<HTMLElement>('[data-section]')) {
      if (node.offsetTop <= container.scrollTop + 8) current = node.dataset.section ?? current
    }
    if (current) setActive(current)
  }

  const shown = hovered ?? sections[0]?.emojis[0] ?? null

  return (
    <div className="flex h-[26rem] w-[26rem] flex-col" onKeyDown={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 border-b border-border-primary p-3">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-secondary-text" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setHovered(null)
              scrollRef.current?.scrollTo({ top: 0 })
            }}
            onKeyDown={(e) => {
              const first = sections[0]?.emojis[0]
              if (e.key === 'Enter' && query.trim() && first) {
                e.preventDefault()
                pick(first.emoji)
              }
            }}
            placeholder="Find the perfect emoji"
            aria-label="Search emoji"
            className="h-9 w-full rounded-lg border border-border-card bg-secondary-bg py-2 pr-2 pl-8 text-sm text-primary-text placeholder-secondary-text focus:border-button-info focus:outline-none"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Choose skin tone"
            aria-expanded={toneOpen}
            onClick={() => setToneOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-quaternary-bg"
          >
            <Emoji emoji={TONE_SAMPLES[tone]} />
          </button>
          {toneOpen && (
            <div className="absolute top-0 right-0 z-10 flex flex-col gap-0.5 rounded-lg border border-border-card bg-primary-bg p-1 shadow-lg">
              {TONE_SAMPLES.map((sample, index) => (
                <button
                  key={sample}
                  type="button"
                  aria-label={index ? `Skin tone ${index}` : 'Default skin tone'}
                  onClick={() => {
                    setSkinTone(index)
                    setToneOpen(false)
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded-md text-xl transition-colors hover:bg-quaternary-bg ${index === tone ? 'bg-tertiary-bg' : ''}`}
                >
                  <Emoji emoji={sample} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {!query.trim() && data && (
          <nav className="flex w-12 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-border-primary bg-secondary-bg/50 py-2">
            {sections.map((section) => (
              <Tooltip key={section.key}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={section.label}
                    onClick={() => jumpTo(section.key)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-lg transition-all hover:bg-quaternary-bg hover:grayscale-0 ${
                      active === section.key ? 'bg-tertiary-bg text-primary-text' : 'text-secondary-text grayscale'
                    }`}
                  >
                    {section.icon}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{section.label}</TooltipContent>
              </Tooltip>
            ))}
          </nav>
        )}

        <div ref={scrollRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {!data ? (
            <p className="p-4 text-center text-xs text-quaternary-text">Loading…</p>
          ) : (
            sections.map((section) => (
              <section key={section.key} data-section={section.key}>
                <h3 className="sticky top-0 z-[1] bg-primary-bg px-1 pt-2 pb-1 text-xs font-semibold text-secondary-text">
                  {section.label}
                </h3>
                <div className="grid grid-cols-8 gap-0.5">
                  {section.emojis.map((item) => (
                    <button
                      key={item.emoji}
                      type="button"
                      aria-label={`:${item.entry?.names[0] ?? item.emoji}:`}
                      onPointerEnter={() => setHovered(item)}
                      onClick={() => pick(item.emoji)}
                      className="flex aspect-square items-center justify-center rounded-md text-[1.6rem] transition-colors hover:bg-quaternary-bg"
                    >
                      <Emoji emoji={item.emoji} />
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      <div className="flex h-12 shrink-0 items-center gap-2 border-t border-border-primary bg-secondary-bg/50 px-3">
        {shown && (
          <>
            <span className="text-2xl">
              <Emoji emoji={shown.emoji} />
            </span>
            <span className="truncate text-sm font-semibold text-primary-text">
              {shown.entry ? shown.entry.names.map((name) => `:${name}:`).join(' ') : shown.emoji}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Open emoji picker"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-secondary-text transition-colors hover:text-primary-text"
            >
              <EmojiIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Open emoji picker</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" sideOffset={8} className="w-auto overflow-hidden p-0">
        <EmojiPanel
          onSelect={(emoji) => {
            recordEmojiUse(emoji)
            onSelect(emoji)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
