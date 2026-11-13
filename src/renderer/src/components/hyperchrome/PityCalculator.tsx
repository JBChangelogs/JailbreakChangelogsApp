import { createContext, useContext, useEffect, useState } from 'react'
import { SidebarHeader } from '@renderer/components/ui/sidebar-header'
import {
  HYPERCHROME_CHANCE_DENOMINATORS,
  HYPERCHROME_PITY_BIG,
  HYPERCHROME_PITY_SMALL,
  bigPityAtLevel,
  equivalentPity,
  robberiesToBigPityGoal,
  robberiesToLevelUp,
  type HyperchromeLevel
} from '@shared/hyperchrome'

const JAR_URL = 'https://assets.jailbreakchangelogs.com/assets/images/items/hyperchromes/jars'
const STORAGE_KEY = 'jbcl:hyperchrome-pity'
const LEVELS: HyperchromeLevel[] = [0, 1, 2, 3, 4]

const COLORS = [
  { name: 'HyperRed', robbery: 'Tomb', hue: 'hsl(358, 99%, 53%)' },
  { name: 'HyperOrange', robbery: 'Museum', hue: 'hsl(45, 87%, 66%)' },
  { name: 'HyperYellow', robbery: 'Cargo / Passenger Train', hue: 'hsl(57, 99%, 59%)' },
  { name: 'HyperGreen', robbery: 'Rising City Bank', hue: 'hsl(119, 100%, 60%)' },
  { name: 'HyperDiamond', robbery: 'Jewelry Store', hue: 'hsl(180, 99%, 51%)' },
  { name: 'HyperBlue', robbery: 'Cargo Plane', hue: 'hsl(275, 99%, 52%)' },
  { name: 'HyperPurple', robbery: 'Power Plant', hue: 'hsl(296, 88%, 78%)' },
  { name: 'HyperPink', robbery: 'Crown Jewel', hue: 'hsl(327, 93%, 54%)' }
] as const

type ColorName = (typeof COLORS)[number]['name']

interface ColorProgress {
  level: HyperchromeLevel
  pity: number
}

type PityMode = 'track' | 'quick'

interface SavedState {
  mode: PityMode
  selected: ColorName
  small: boolean
  colors: Partial<Record<ColorName, ColorProgress>>
  quick: ColorProgress | null
}

const DEFAULT_STATE: SavedState = { mode: 'track', selected: 'HyperRed', small: false, colors: {}, quick: null }

interface Subject {
  key: string
  label: string
  jar: string
  robbery: string
  hue: string
}

const QUICK_SUBJECT: Subject = {
  key: 'quick',
  label: 'Quick calculator',
  jar: 'HyperChrome_Wildcard',
  robbery: '',
  hue: 'var(--color-button-info)'
}

const validProgress = (entry: Partial<ColorProgress> | null | undefined): ColorProgress | null =>
  entry && LEVELS.includes(entry.level as HyperchromeLevel) && typeof entry.pity === 'number'
    ? { level: entry.level as HyperchromeLevel, pity: Math.min(Math.max(entry.pity, 0), 100) }
    : null

function loadState(): SavedState {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<SavedState> | null
    if (!raw) return DEFAULT_STATE
    const selected = COLORS.some((c) => c.name === raw.selected) ? (raw.selected as ColorName) : 'HyperRed'
    const colors: SavedState['colors'] = {}
    for (const { name } of COLORS) {
      const entry = validProgress(raw.colors?.[name])
      if (entry) colors[name] = entry
    }
    return {
      mode: raw.mode === 'quick' ? 'quick' : 'track',
      selected,
      small: raw.small === true,
      colors,
      quick: validProgress(raw.quick)
    }
  } catch {
    return DEFAULT_STATE
  }
}

function sanitizeDecimal(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, '').replace(/^0+(?=\d)/, '')
  const dot = cleaned.indexOf('.')
  if (dot === -1) return cleaned
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 1)
}

const formatPct = (n: number): string => `${Number(n.toFixed(1))}%`

interface PityState {
  mode: PityMode
  setMode: (mode: PityMode) => void
  selectedColor: ColorName
  selected: Subject
  select: (name: ColorName) => void
  progress: Partial<Record<ColorName, ColorProgress>>
  current: ColorProgress | null
  setLevel: (level: HyperchromeLevel) => void
  setPity: (pity: number) => void
  reset: () => void
  small: boolean
  setSmall: (small: boolean) => void
}

const PityContext = createContext<PityState | null>(null)

function usePity(): PityState {
  const value = useContext(PityContext)
  if (!value) throw new Error('usePity must be used inside PityCalculatorProvider')
  return value
}

export function PityCalculatorProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [state, setState] = useState(loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
    }
  }, [state])

  const color = COLORS.find((c) => c.name === state.selected) ?? COLORS[0]
  const quick = state.mode === 'quick'
  const selected: Subject = quick
    ? QUICK_SUBJECT
    : { key: color.name, label: color.name, jar: color.name, robbery: color.robbery, hue: color.hue }
  const current = quick ? state.quick : (state.colors[color.name] ?? null)
  const update = (patch: Partial<ColorProgress>): void =>
    setState((s) => {
      if (s.mode === 'quick') return { ...s, quick: { ...(s.quick ?? { level: 0, pity: 0 }), ...patch } }
      const prev = s.colors[s.selected] ?? { level: 0, pity: 0 }
      return { ...s, colors: { ...s.colors, [s.selected]: { ...prev, ...patch } } }
    })

  return (
    <PityContext.Provider
      value={{
        mode: state.mode,
        setMode: (mode) => setState((s) => ({ ...s, mode })),
        selectedColor: color.name,
        selected,
        select: (name) => setState((s) => ({ ...s, selected: name })),
        progress: state.colors,
        current,
        setLevel: (level) => update({ level }),
        setPity: (pity) => update({ pity: Math.min(Math.max(pity, 0), 100) }),
        reset: () =>
          setState((s) => {
            if (s.mode === 'quick') return { ...s, quick: null }
            const colors = { ...s.colors }
            delete colors[s.selected]
            return { ...s, colors }
          }),
        small: state.small,
        setSmall: (small) => setState((s) => ({ ...s, small }))
      }}
    >
      {children}
    </PityContext.Provider>
  )
}

function Jar({ name, className }: { name: string; className?: string }): React.JSX.Element {
  return <img src={`${JAR_URL}/${name}.webp`} alt="" className={`shrink-0 object-contain ${className ?? ''}`} draggable={false} />
}

export function PityCalculatorSidebar(): React.JSX.Element {
  const { mode, setMode, selectedColor, select, progress } = usePity()
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <SidebarHeader>
        <Segmented
          label="Calculator mode"
          value={mode}
          options={[
            { value: 'track', label: 'Track colors' },
            { value: 'quick', label: 'Simple' }
          ]}
          onChange={setMode}
        />
      </SidebarHeader>
      {mode === 'quick' ? (
        <div className="space-y-2 p-3 text-xs text-tertiary-text">
          <p>Work out the robberies for any level and pity without picking a color.</p>
          <p>Switch to Track colors to save progress for each of your HyperChromes.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          <h1 className="px-2 pt-1 pb-1 text-xs font-bold tracking-wide text-quaternary-text uppercase">Your HyperChromes</h1>
          {COLORS.map((color) => {
            const entry = progress[color.name]
            const isSelected = color.name === selectedColor
            return (
              <button
                key={color.name}
                type="button"
                onClick={() => select(color.name)}
                aria-pressed={isSelected}
                className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors ${isSelected ? 'border-button-info/50 bg-tertiary-bg' : 'border-transparent hover:bg-tertiary-bg/60'
                  }`}
              >
                <Jar name={color.name} className="h-9 w-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-primary-text">{color.name}</span>
                  <span className="block truncate text-xs text-secondary-text">{color.robbery}</span>
                </span>
                {entry ? (
                  <span className="shrink-0 text-right">
                    <span className="block text-xs font-semibold text-primary-text">Lvl {entry.level}</span>
                    <span className="block text-[11px] text-tertiary-text tabular-nums">{formatPct(entry.pity)}</span>
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] text-quaternary-text">Not set</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: T | null
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}): React.JSX.Element {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl border border-border-card bg-secondary-bg p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-8 flex-1 rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition-colors ${value === o.value ? 'bg-button-info text-form-button-text' : 'text-secondary-text hover:text-primary-text'
            }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const fieldLabel = 'mb-2 block text-xs font-semibold text-secondary-text'

function Controls(): React.JSX.Element {
  const { selected, current, setLevel, setPity, small, setSmall, reset } = usePity()
  const [text, setText] = useState(current ? String(current.pity) : '')
  const tooHigh = Number(text) > 100

  const onText = (raw: string): void => {
    const value = sanitizeDecimal(raw)
    setText(value)
    if (Number(value) <= 100) setPity(Number(value) || 0)
  }

  return (
    <div className="grid gap-5 rounded-2xl border border-border-card bg-tertiary-bg p-4 lg:grid-cols-[auto_1fr_auto]">
      <div>
        <span className={fieldLabel}>Current level</span>
        <Segmented
          label="Current level"
          value={current?.level ?? null}
          options={LEVELS.map((l) => ({ value: l, label: String(l) }))}
          onChange={setLevel}
        />
        <p className="mt-1.5 text-xs text-tertiary-text">0 if you don&apos;t own this color yet.</p>
      </div>

      <div className="min-w-0">
        <label htmlFor="pity-value" className={fieldLabel}>
          Pity shown in a {small ? 'small' : 'big'} server
        </label>
        <div className="flex items-center gap-3">
          <div className="relative w-24 shrink-0">
            <input
              id="pity-value"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              maxLength={5}
              value={text}
              aria-invalid={tooHigh}
              onChange={(e) => onText(e.target.value)}
              className={`h-10 w-full rounded-xl border bg-secondary-bg pr-7 pl-3 text-sm text-primary-text tabular-nums outline-none focus:border-button-info ${tooHigh ? 'border-status-error' : 'border-border-card'
                }`}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-secondary-text">%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={current?.pity ?? 0}
            onChange={(e) => onText(e.target.value)}
            aria-label="Pity percent"
            className="min-w-0 flex-1 accent-button-info"
          />
        </div>
        <p className={`mt-1.5 text-xs ${tooHigh ? 'text-status-error' : 'text-tertiary-text'}`}>
          {tooHigh
            ? "Pity can't go above 100%."
            : small
              ? '66% in a small server equals 100% in a big one.'
              : 'At 100%, your next roll is a guaranteed level-up.'}
        </p>
      </div>

      <div>
        <span className={fieldLabel}>Server</span>
        <Segmented
          label="Server size"
          value={small ? 'small' : 'big'}
          options={[
            { value: 'big', label: 'Big (9+)' },
            { value: 'small', label: 'Small (0-8)' }
          ]}
          onChange={(v) => setSmall(v === 'small')}
        />
        {current && (
          <button type="button" onClick={reset} className="mt-1.5 text-xs text-tertiary-text hover:text-primary-text hover:underline">
            {selected.key === 'quick' ? 'Reset' : 'Clear this color'}
          </button>
        )}
      </div>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }): React.JSX.Element {
  return <div className={`rounded-2xl border border-border-card bg-tertiary-bg p-4 ${className}`}>{children}</div>
}

function Results(): React.JSX.Element | null {
  const { selected, current, small } = usePity()
  if (!current) {
    return (
      <Card className="flex items-center gap-4">
        <Jar name={selected.jar} className="h-14 w-14 opacity-60" />
        <p className="text-sm text-secondary-text">
          {selected.key === 'quick' ? (
            'Pick a level above to see how many robberies are left until the next one.'
          ) : (
            <>
              Pick your <span className="font-semibold text-primary-text">{selected.label}</span> level above to see how many{' '}
              {selected.robbery} robberies you have left.
            </>
          )}
        </p>
      </Card>
    )
  }

  const { level, pity } = current
  const needed = robberiesToLevelUp(level, pity, small)
  const total = (small ? HYPERCHROME_PITY_SMALL : HYPERCHROME_PITY_BIG)[level]
  const tip = robberiesToBigPityGoal(level, pity, small)
  const server = small ? 'small' : 'big'

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-5 p-5" style={{ background: `color-mix(in srgb, ${selected.hue} 8%, transparent)` }}>
          <Jar name={selected.jar} className="h-20 w-20" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-secondary-text">
              {selected.key === 'quick' ? 'HyperChrome' : selected.label} · Level {level} → <span className="font-semibold text-primary-text">Level {level + 1}</span>
            </p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-black text-primary-text tabular-nums">{needed.toLocaleString()}</span>
              <span className="text-lg font-bold text-secondary-text">
                {selected.robbery && `${selected.robbery} `}
                {needed === 1 ? 'robbery' : 'robberies'} left
              </span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-quaternary-bg">
              <div className="h-full rounded-full transition-[width]" style={{ width: `${pity}%`, backgroundColor: selected.hue }} />
            </div>
            <p className="mt-1.5 text-xs text-tertiary-text">
              {formatPct(pity)} of {total.toLocaleString()} robberies in {server} servers · equal to{' '}
              {formatPct(equivalentPity(level, pity, small))} in {small ? 'big' : 'small'} servers
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="mb-1.5 text-sm font-bold text-status-warning">Tip</p>
          <p className="text-sm text-primary-text">
            {small ? (
              <>
                After <span className="font-black">{tip.toLocaleString()}</span> more robberies you&apos;ll hit 66%. Switch to a big
                server then and your next roll is guaranteed.
              </>
            ) : (
              <>Big servers don&apos;t fill pity faster, they use a different scale. They also give 1.5x the natural odds.</>
            )}
          </p>
          {small && <p className="mt-2 text-xs text-secondary-text">Small servers also have 0.66x the natural HyperChrome odds.</p>}
        </Card>
        <Card className="flex items-center gap-4">
          <Jar name="HyperChrome_Wildcard" className="h-12 w-12" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary-text">Wildcard (random color)</p>
            <p className="text-sm text-secondary-text">
              <span className="font-black text-primary-text">{needed.toLocaleString()}</span> VP / Mansion defeats left at the same
              pity.
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <p className="text-sm font-bold text-primary-text">If you trade for another level</p>
        <p className="mb-3 text-xs text-secondary-text">Trading doesn&apos;t reset pity. Your big server pity at each other level:</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {LEVELS.filter((other) => other !== level).map((other) => {
            const pct = bigPityAtLevel(level, pity, small, other)
            const capped = Math.min(pct, 100)
            const color =
              capped >= 66 ? 'var(--color-status-success)' : capped >= 33 ? 'var(--color-status-warning)' : 'var(--color-status-error)'
            return (
              <div key={other} className="rounded-xl border border-border-card bg-secondary-bg p-3">
                <p className="text-[11px] font-semibold tracking-wide text-secondary-text uppercase">Level {other}</p>
                <p className="mt-0.5 text-xl font-black tabular-nums" style={{ color }}>
                  {pct >= 100 ? '100%' : formatPct(pct)}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-quaternary-bg">
                  <div className="h-full rounded-full" style={{ width: `${capped}%`, backgroundColor: color }} />
                </div>
                <p className="mt-1.5 text-[11px] text-tertiary-text">{pct >= 100 ? 'Guaranteed next roll' : 'Big server pity'}</p>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function Reference(): React.JSX.Element {
  return (
    <details className="group rounded-2xl border border-border-card bg-tertiary-bg">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold text-primary-text">
        How pity works
        <span className="text-xs font-normal text-tertiary-text group-open:hidden">Show</span>
        <span className="hidden text-xs font-normal text-tertiary-text group-open:inline">Hide</span>
      </summary>
      <div className="space-y-3 border-t border-border-card px-4 py-4 text-sm text-primary-text">
        <p>
          HyperChromes are the rarest bonus roulette reward. Your first roll of a color gives Level 1, and each roll after that levels
          it up, to a max of Level 5. Every miss adds pity to that color; at 100% your next roll is guaranteed.
        </p>
        <p>
          Pity needed is the chance denominator × 1.25. Small servers (0-8 players) and private servers run at 66% odds, so they need
          more rolls. Rolling a HyperChrome resets that color&apos;s pity; trading for one doesn&apos;t.
        </p>
        <table className="min-w-full text-sm">
          <thead className="text-secondary-text">
            <tr className="border-b border-border-card text-left">
              {['Level', 'Chance per roll', 'Approx. %', 'Pity (big)', 'Pity (small)'].map((h) => (
                <th key={h} className="px-2 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HYPERCHROME_CHANCE_DENOMINATORS.map((d, i) => (
              <tr key={d} className="border-b border-border-card/60 last:border-b-0">
                <td className="px-2 py-2 font-semibold">{i + 1}</td>
                <td className="px-2 py-2">1/{d}</td>
                <td className="px-2 py-2">~{((1 / d) * 100).toFixed(3)}%</td>
                <td className="px-2 py-2">{HYPERCHROME_PITY_BIG[i]}</td>
                <td className="px-2 py-2">{HYPERCHROME_PITY_SMALL[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

export function PityCalculatorScreen(): React.JSX.Element {
  const { selected } = usePity()
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex h-[57px] shrink-0 items-center gap-2.5 border-b border-border-primary px-5">
        <Jar name={selected.jar} className="h-6 w-6" />
        <h2 className="text-sm font-semibold text-primary-text">{selected.label}</h2>
        {selected.robbery && <span className="text-xs text-tertiary-text">· {selected.robbery}</span>}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <Controls key={selected.key} />
        <Results />
        <Reference />
      </div>
    </div>
  )
}
