import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { accountApi } from '@renderer/lib/accountApi'
import { usersApi } from '@renderer/lib/usersApi'
import {
  ACCENT_STYLES,
  accentCardTheme,
  accentColorToHex,
  hexToHsv,
  hsvToHex,
  type Accent,
  type AccentStyle
} from '@renderer/lib/accentColor'
import { showToast } from '@renderer/lib/toast'
import { Button } from '@renderer/components/ui/button'
import { ColorSwatch } from '@renderer/components/ui/color-picker'
import { Tabs } from '@renderer/components/ui/tabs'

const DEFAULT_COLOR = '#2462cd'
const SAVE_DELAY_MS = 600

const STYLE_NAMES: Record<AccentStyle, string> = {
  solid: 'Solid',
  glass: 'Glass',
  transparent: 'Transparent'
}

const sameAccent = (a: Accent, b: Accent | null): boolean =>
  a.color === b?.color && a.gradient === b.gradient && a.style === b.style

function errorMessage(err: unknown): string | undefined {
  return err instanceof Error ? err.message : undefined
}

function useAccentColor(): {
  accent: Accent | null
  customAccent: Accent | null
  setAccent: (accent: Accent) => void
  reset: () => void
} {
  const { token } = useAuth()
  const { user } = useCurrentUser()
  const [customAccent, setCustomAccent] = useState<Accent | null>(null)
  const [discordColor, setDiscordColor] = useState<string | null>(null)
  const [draft, setDraft] = useState<Accent | null>(null)
  const saveQueue = useRef(Promise.resolve())
  const pending = useRef(0)
  const customRef = useRef(customAccent)
  customRef.current = customAccent

  const enqueue = (task: () => Promise<void>): void => {
    pending.current++
    saveQueue.current = saveQueue.current.then(task).finally(() => {
      pending.current--
    })
  }

  useEffect(() => {
    if (!token || !user) return
    accountApi
      .accentColor(token)
      .then(setCustomAccent)
      .catch(() => {})
    usersApi
      .get(token, user.id)
      .then((profile) =>
        setDiscordColor(accentColorToHex((profile as { accent_color?: number | string | null }).accent_color))
      )
      .catch(() => {})
  }, [token, user?.id])

  useEffect(() => {
    if (!draft || !token) return
    const value = draft
    const timer = setTimeout(() => {
      if (pending.current === 0 && sameAccent(value, customRef.current)) return
      enqueue(() =>
        accountApi
          .saveAccentColor(token, value)
          .then(() => setCustomAccent(value))
          .catch((err: unknown) => {
            showToast("Couldn't save accent color", { description: errorMessage(err) })
          })
          .finally(() => setDraft((current) => (current === value ? null : current)))
      )
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draft, token])

  const reset = (): void => {
    if (!token) return
    enqueue(async () => {
      try {
        await accountApi.saveAccentColor(token, null)
        setDraft(null)
        setCustomAccent(null)
        showToast('Accent color reset to your Discord color')
      } catch (err) {
        showToast("Couldn't reset accent color", { description: errorMessage(err) })
      }
    })
  }

  return {
    accent: draft ?? customAccent ?? (discordColor ? { color: discordColor, gradient: null, style: 'solid' } : null),
    customAccent,
    setAccent: setDraft,
    reset
  }
}

export function AccentColorSetting(): React.JSX.Element {
  const { user } = useCurrentUser()
  const { accent, customAccent, setAccent, reset } = useAccentColor()
  const tier = user?.premiumtype ?? 0
  const canEdit = (): boolean => {
    if (tier >= 1 && tier <= 3) return true
    showToast('Custom accent colors need a supporter tier', {
      description: 'Become a supporter on the website to color your profile cards.'
    })
    return false
  }

  const current: Accent = accent ?? { color: DEFAULT_COLOR, gradient: null, style: 'solid' }
  const update = (patch: Partial<Accent>): void => setAccent({ ...current, ...patch })
  const setGradient = (on: boolean): void => {
    if (!canEdit()) return
    const hsv = hexToHsv(current.color)
    update({ gradient: on ? hsvToHex({ ...hsv, h: (hsv.h + 60) % 360 }) : null })
  }
  const name = user?.global_name && user.global_name !== 'None' ? user.global_name : user?.username

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-medium text-primary-text">Accent color</h3>
        <p className="mt-1 text-sm text-secondary-text">
          Choose the color and style of your profile cards.{' '}
          {customAccent ? 'Using your custom color.' : 'Using your Discord color.'}
          {customAccent && (
            <>
              {' '}
              <button
                type="button"
                onClick={reset}
                className="text-link underline-offset-4 hover:text-link-hover hover:underline"
              >
                Reset to Discord color
              </button>
            </>
          )}
        </p>
      </div>

      <div role="group" aria-label="Color" className="space-y-2">
        <Tabs
          value={current.gradient ? 'gradient' : 'single'}
          onChange={(value) => setGradient(value === 'gradient')}
          options={[
            { value: 'single', label: 'Single color' },
            { value: 'gradient', label: 'Gradient' }
          ]}
        />
        <div className="flex items-center gap-2 rounded-xl border border-border-card bg-tertiary-bg p-2">
          <ColorSwatch
            label={current.gradient ? 'Start' : 'Color'}
            value={current.color}
            onChange={(color) => update({ color })}
            canOpen={canEdit}
          />
          <div
            className="relative grid h-11 min-w-0 flex-1 place-items-center rounded-lg border border-black/10 shadow-inner"
            style={{
              background: current.gradient
                ? `linear-gradient(90deg, ${current.color}, ${current.gradient}) border-box`
                : current.color
            }}
          >
            {current.gradient && (
              <button
                type="button"
                aria-label="Swap start and end colors"
                onClick={() => canEdit() && update({ color: current.gradient!, gradient: current.color })}
                className="rounded-full border border-border-card bg-secondary-bg p-1.5 text-secondary-text shadow-sm transition-colors hover:text-primary-text"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 3 4 7l4 4M4 7h16m-4 14 4-4-4-4m4 4H4" />
                </svg>
              </button>
            )}
          </div>
          {current.gradient && (
            <ColorSwatch
              label="End"
              value={current.gradient}
              onChange={(gradient) => update({ gradient })}
              canOpen={canEdit}
            />
          )}
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-primary-text">Card style</legend>
        <div className="grid grid-cols-3 gap-2">
          {ACCENT_STYLES.map((style) => (
            <label
              key={style}
              className="group cursor-pointer overflow-hidden rounded-lg border border-border-card transition-colors hover:border-border-focus/60 has-checked:border-button-info has-focus-visible:ring-2 has-focus-visible:ring-border-focus"
            >
              <input
                type="radio"
                name="accent-style"
                value={style}
                checked={current.style === style}
                onChange={() => canEdit() && update({ style })}
                className="sr-only"
              />
              <span
                aria-hidden
                data-accent-cards={style}
                style={accentCardTheme({ ...current, style })}
                className="relative flex h-20 items-end overflow-hidden bg-tertiary-bg p-2"
              >
                {user?.banner && (
                  <img src={user.banner} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />
                )}
                <span className="relative flex w-full min-w-0 items-center gap-1.5 rounded-md border border-border-card bg-secondary-bg p-1.5">
                  {user?.avatar && (
                    <img src={user.avatar} alt="" className="size-5 shrink-0 rounded-full object-cover" />
                  )}
                  <span className="truncate text-xs font-semibold text-primary-text">{name}</span>
                </span>
              </span>
              <span className="flex items-center justify-between gap-2 border-t border-border-card px-2.5 py-1.5 group-has-checked:bg-button-info/10">
                <span className="text-sm text-primary-text">{STYLE_NAMES[style]}</span>
                <span
                  aria-hidden
                  className="size-3.5 shrink-0 rounded-full border-2 border-border-card transition-colors group-has-checked:border-button-info group-has-checked:bg-button-info group-has-checked:shadow-[inset_0_0_0_2px_var(--color-secondary-bg)]"
                />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

export function BackgroundButton(): React.JSX.Element {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={() => void window.api.openExternal('https://jailbreakchangelogs.com/settings#appearance')}
    >
      Change on website
    </Button>
  )
}
