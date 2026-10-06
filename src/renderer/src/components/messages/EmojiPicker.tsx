import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { Emoji } from '@renderer/components/messages/Emoji'
import { useEmojis } from '@renderer/hooks/useEmojis'

function EmojiIcon({ className }: { className?: string }): React.JSX.Element {
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

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }): React.JSX.Element {
  const emojis = useEmojis()
  const [open, setOpen] = useState(false)
  const entries = Object.entries(emojis)

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
      <PopoverContent align="end" sideOffset={8} className="w-72 p-2">
        {entries.length === 0 ? (
          <p className="p-2 text-center text-xs text-quaternary-text">Loading…</p>
        ) : (
          <div className="grid max-h-56 grid-cols-7 gap-1 overflow-x-hidden overflow-y-auto">
            {entries.map(([name, emoji]) => (
              <button
                key={name}
                type="button"
                title={`:${name}:`}
                onClick={() => {
                  onSelect(emoji)
                  setOpen(false)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-quaternary-bg"
              >
                <Emoji emoji={emoji} />
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
