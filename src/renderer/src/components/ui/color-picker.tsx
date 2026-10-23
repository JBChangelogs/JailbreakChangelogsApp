import { useRef, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { hexToHsv, hsvToHex, type Hsv } from '@renderer/lib/accentColor'

const PRESETS = [
  '#5865f2',
  '#2462cd',
  '#1abc9c',
  '#3ba55c',
  '#fee75c',
  '#faa61a',
  '#e67e22',
  '#ed4245',
  '#eb459e',
  '#9b59b6',
  '#99aab5',
  '#23272a'
]
const clamp = (n: number): number => Math.min(1, Math.max(0, n))

export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }): React.JSX.Element {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value))
  const [hexText, setHexText] = useState(value)
  const areaRef = useRef<HTMLDivElement>(null)

  const update = (next: Hsv): void => {
    setHsv(next)
    const hex = hsvToHex(next)
    setHexText(hex)
    onChange(hex)
  }

  const pickFromPointer = (event: React.PointerEvent): void => {
    const rect = areaRef.current?.getBoundingClientRect()
    if (!rect) return
    update({
      ...hsv,
      s: clamp((event.clientX - rect.left) / rect.width),
      v: clamp(1 - (event.clientY - rect.top) / rect.height)
    })
  }

  return (
    <div className="space-y-3">
      <div
        ref={areaRef}
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s * 100)}
        aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          pickFromPointer(event)
        }}
        onPointerMove={(event) => {
          if (event.buttons) pickFromPointer(event)
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 0.1 : 0.02
          const moves: Record<string, Partial<Hsv>> = {
            ArrowLeft: { s: clamp(hsv.s - step) },
            ArrowRight: { s: clamp(hsv.s + step) },
            ArrowUp: { v: clamp(hsv.v + step) },
            ArrowDown: { v: clamp(hsv.v - step) }
          }
          if (moves[event.key]) {
            event.preventDefault()
            update({ ...hsv, ...moves[event.key] })
          }
        }}
        className="relative h-36 w-full cursor-crosshair touch-none rounded-lg focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:outline-none"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: hsvToHex(hsv) }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={359}
        value={Math.round(hsv.h)}
        onChange={(event) => update({ ...hsv, h: Number(event.target.value) })}
        aria-label="Hue"
        className="h-3 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
      />

      <div className="grid grid-cols-6 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => update(hexToHsv(preset))}
            aria-label={`Use ${preset}`}
            className="aspect-square rounded-md border border-black/20 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:outline-none"
            style={{ backgroundColor: preset }}
          />
        ))}
      </div>

      <label className="flex items-center gap-2">
        <span className="text-xs font-medium text-secondary-text">Hex</span>
        <input
          type="text"
          value={hexText}
          maxLength={7}
          spellCheck={false}
          onChange={(event) => {
            const text = event.target.value.trim()
            setHexText(text)
            const normalized = text.startsWith('#') ? text : `#${text}`
            if (/^#[0-9a-f]{6}$/i.test(normalized)) update(hexToHsv(normalized.toLowerCase()))
          }}
          className="h-8 w-full rounded-md border border-border-card bg-tertiary-bg px-2 font-mono text-sm text-primary-text outline-none focus:border-button-info"
        />
      </label>
    </div>
  )
}

export function ColorSwatch({
  label,
  value,
  onChange,
  canOpen
}: {
  label: string
  value: string
  onChange: (hex: string) => void
  canOpen: () => boolean
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={(next) => setOpen(next && canOpen())}>
      <PopoverTrigger className="flex items-center gap-2.5 rounded-lg border border-border-card bg-secondary-bg py-1.5 pr-3 pl-1.5 text-left transition-colors hover:border-border-focus/60 focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:outline-none">
        <span
          aria-hidden
          className="size-8 shrink-0 rounded-md border border-black/20 shadow-inner"
          style={{ backgroundColor: value }}
        />
        <span>
          <span className="block text-xs text-secondary-text">{label}</span>
          <span className="block font-mono text-sm text-primary-text uppercase">{value}</span>
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <ColorPicker value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}
