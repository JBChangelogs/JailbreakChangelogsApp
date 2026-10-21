import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useTheme } from '@renderer/contexts/ThemeContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { usePreferences } from '@renderer/contexts/PreferencesContext'
import { Button } from '@renderer/components/ui/button'
import { Switch } from '@renderer/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { ThemeIcon } from '@renderer/components/ui/theme-icon'
import { themeColor, type SiteTheme } from '@renderer/lib/themes'
import { showToast } from '@renderer/lib/toast'
import {
  SITE_THEMES_URL,
  ThemeNotFoundError,
  asSiteTheme,
  fetchMyThemes,
  fetchSharedTheme,
  parseShareCode,
  type CustomTheme
} from '@renderer/lib/customThemes'

// Laid out like the website's Settings → Themes, minus the editor: making and editing themes
// stays on the website, so those actions link there.

const shareUrl = (code: string): string => `https://jailbreakchangelogs.com/?theme=${code}`

/**
 * The theme's colors: dots for its main colors on its page background, each named in a
 * tooltip. Hidden from screen readers; the label names the theme.
 */
function ThemePreview({ theme }: { theme: SiteTheme }): React.JSX.Element {
  const page = themeColor(theme, '--color-primary-bg')
  const text = themeColor(theme, '--color-primary-text')
  const dots = [
    ['Cards', themeColor(theme, '--color-secondary-bg')],
    ['Secondary text', themeColor(theme, '--color-secondary-text')],
    ['Text', text],
    ['Buttons', themeColor(theme, '--color-button-info')],
    ['Links', themeColor(theme, '--color-link')]
  ]
  return (
    <span aria-hidden="true" className="flex h-20 items-center justify-center" style={{ background: page }}>
      <span className="flex -space-x-2">
        {dots.map(([use, color]) => (
          <Tooltip key={use}>
            <TooltipTrigger asChild>
              <span
                className="size-8 rounded-full border-2"
                style={{
                  background: color,
                  borderColor: page,
                  // Outlined so colors close to the background still show.
                  outline: `1px solid color-mix(in srgb, ${text} 25%, transparent)`
                }}
              />
            </TooltipTrigger>
            <TooltipContent>{use}</TooltipContent>
          </Tooltip>
        ))}
      </span>
    </span>
  )
}

/** One theme's radio card: its colors above, its name below. */
function ThemeCard({
  theme,
  checked,
  onSelect,
  badge
}: {
  theme: SiteTheme
  checked: boolean
  onSelect: () => void
  /** Marks a custom theme on its preview: "Custom" or "Shared". */
  badge?: string
}): React.JSX.Element {
  return (
    <label className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border-card transition-[border-color,box-shadow] hover:border-border-focus/60 has-checked:border-button-info has-checked:ring-2 has-checked:ring-button-info/30 has-focus-visible:ring-2 has-focus-visible:ring-border-focus">
      <input type="radio" name="theme" value={theme.slug} checked={checked} onChange={onSelect} className="sr-only" />
      <span className="relative block">
        <ThemePreview theme={theme} />
        {badge && (
          <span className="absolute top-1.5 left-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] leading-none font-semibold tracking-wide text-white uppercase">
            {badge}
          </span>
        )}
      </span>
      <span className="flex min-h-14 flex-1 items-center gap-2 border-t border-border-card px-3 py-2 group-has-checked:bg-button-info/10">
        <ThemeIcon icon={theme.icon} className="size-4 shrink-0 text-secondary-text" />
        <span className="min-w-0 text-sm leading-tight font-medium text-primary-text">{theme.label}</span>
        <span
          aria-hidden="true"
          className="ml-auto size-3.5 shrink-0 rounded-full border-2 border-border-card transition-colors group-has-checked:border-button-info group-has-checked:bg-button-info group-has-checked:shadow-[inset_0_0_0_2px_var(--color-secondary-bg)]"
        />
      </span>
    </label>
  )
}

function MenuIcon({ path }: { path: string }): React.JSX.Element {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

const LINK_ICON =
  'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244'
const EXTERNAL_ICON =
  'M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25'
const X_ICON = 'M6 18 18 6M6 6l12 12'

/** A custom theme's "…" menu, beside its card (and on right-click). */
function CustomThemeMenu({
  theme,
  own,
  onRemove,
  children
}: {
  theme: CustomTheme
  own: boolean
  onRemove: () => void
  children: React.ReactNode
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const item = 'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm'
  return (
    <div
      className="relative h-full"
      onContextMenu={(e) => {
        e.preventDefault()
        setOpen(true)
      }}
    >
      {children}
      {/* Beside the card, not in it, so opening it doesn't pick the theme. */}
      <div className="absolute top-2 right-2">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Options for ${theme.label}`}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border-card bg-secondary-bg/80 text-primary-text backdrop-blur-sm transition-colors hover:bg-quaternary-bg"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44 p-1">
            <DropdownMenuItem
              className={item}
              onSelect={() => {
                void navigator.clipboard.writeText(shareUrl(theme.share_code))
                showToast('Share link copied', { description: theme.share_code })
              }}
            >
              <MenuIcon path={LINK_ICON} />
              Copy share link
            </DropdownMenuItem>
            {own ? (
              <DropdownMenuItem className={item} onSelect={() => void window.api.openExternal(SITE_THEMES_URL)}>
                <MenuIcon path={EXTERNAL_ICON} />
                Edit on website
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className={item} onSelect={onRemove}>
                <MenuIcon path={X_ICON} />
                Remove from list
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/**
 * A pasted theme, tried on the whole app before using it, like the website's shared-theme sheet.
 * Unmounting (Cancel, or leaving the page) puts the theme in use back.
 */
function SharedThemePreview({
  theme,
  inUse,
  onUse,
  onCancel
}: {
  theme: CustomTheme
  inUse: boolean
  onUse: () => void
  onCancel: () => void
}): React.JSX.Element {
  const { setPreviewTheme } = useTheme()

  useEffect(() => {
    setPreviewTheme(theme)
    return () => setPreviewTheme(null)
  }, [theme, setPreviewTheme])

  return (
    <div className="mt-3 flex gap-4 rounded-xl border border-border-card bg-secondary-bg p-3">
      <div className="w-40 shrink-0">
        <div className="overflow-hidden rounded-xl border border-border-card">
          <ThemePreview theme={asSiteTheme(theme)} />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate font-semibold text-primary-text">{theme.label}</p>
        <p className="text-xs text-tertiary-text">
          Shared theme · <span className="font-mono">{theme.share_code}</span>
        </p>
        <p className="mt-2 text-sm text-secondary-text">
          You&apos;re trying this theme on. Cancel puts your own theme back.
        </p>
        <div className="mt-auto flex justify-end gap-2 pt-3">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onUse} disabled={inUse}>
            {inUse ? 'In use' : 'Use this theme'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <h3 className="mb-2 text-xs font-semibold tracking-wide text-secondary-text uppercase">{children}</h3>
}

const PALETTE_ICON =
  'M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z'

/** A settings row with a button on the right, laid out like the switch rows. */
function ActionRow({
  label,
  description,
  children
}: {
  label: string
  description: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-3 py-2">
      <div className="min-w-0">
        <span className="text-sm text-primary-text">{label}</span>
        <p className="mt-0.5 text-xs text-tertiary-text">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SettingRow({
  label,
  description,
  checked,
  onCheckedChange
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-quaternary-bg">
      <div className="min-w-0">
        <span className="text-sm text-primary-text">{label}</span>
        <p className="mt-0.5 text-xs text-tertiary-text">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}

/** Theme picker with previews, plus the other display settings the website has. */
export function DisplaySettingsSection(): React.JSX.Element {
  const { token } = useAuth()
  const {
    applied,
    themes,
    setTheme,
    customTheme,
    setCustomTheme,
    recentThemes,
    rememberSharedTheme,
    forgetSharedTheme,
    cursorEnabled,
    setCursorEnabled,
    shortcutHidden,
    setShortcutHidden
  } = useTheme()
  const { twemojiEnabled, setTwemojiEnabled } = usePreferences()

  const [mine, setMine] = useState<CustomTheme[]>([])
  const [shared, setShared] = useState<Map<string, CustomTheme>>(new Map())
  const [input, setInput] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<CustomTheme | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    if (!token) return
    fetchMyThemes(token)
      .then(setMine)
      .catch(() => {
        // Shown without them; shared themes still work.
      })
  }, [token])

  useEffect(() => {
    for (const code of recentThemes) {
      if (shared.has(code)) continue
      fetchSharedTheme(code)
        .then((theme) => setShared((prev) => new Map(prev).set(code, theme)))
        .catch((err: unknown) => {
          if (err instanceof ThemeNotFoundError) forgetSharedTheme(code)
        })
    }
  }, [recentThemes, shared, forgetSharedTheme])

  const applySharedTheme = (theme: CustomTheme): void => {
    setCustomTheme(theme)
    rememberSharedTheme(theme.share_code)
  }

  const importTheme = async (text = input): Promise<void> => {
    const code = parseShareCode(text)
    if (!code) {
      setError('Enter a theme code or a share link.')
      return
    }
    setLookingUp(true)
    setError(null)
    try {
      setPreviewing(await fetchSharedTheme(code))
      setInput('')
    } catch (err) {
      setError(err instanceof ThemeNotFoundError ? `Theme not found. ${err.message}` : err instanceof Error ? err.message : 'Could not load that theme.')
    } finally {
      setLookingUp(false)
    }
  }

  // Shared ones first (newest first), then your own, like the website.
  const mineCodes = new Set(mine.map((t) => t.share_code))
  const sharedThemes = recentThemes
    .filter((code) => !mineCodes.has(code))
    .map((code) => shared.get(code))
    .filter((t): t is CustomTheme => t !== undefined)
  const customItems = [
    ...sharedThemes.map((theme) => ({ theme, own: false })),
    ...mine.map((theme) => ({ theme, own: true }))
  ]
  const current = customTheme?.label ?? applied.label

  const applyPreviewedTheme = (theme: CustomTheme): void => {
    setShared((prev) => new Map(prev).set(theme.share_code, theme))
    if (mineCodes.has(theme.share_code)) setCustomTheme(theme)
    else applySharedTheme(theme)
    setPreviewing(null)
    showToast(`Using ${theme.label}`, { description: 'Pick another theme in Settings anytime.' })
  }

  const pasteAndImport = async (): Promise<void> => {
    const text = await navigator.clipboard.readText().catch(() => '')
    setInput(text)
    if (text.trim()) void importTheme(text)
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-6">
      <h1 className="text-xl font-bold text-primary-text">Display</h1>
      <p className="mt-1 text-sm text-tertiary-text">Choose how the app looks.</p>

      <div className="mt-4 space-y-0.5">
        <ActionRow
          label="Theme"
          description={`Using ${current}. ${token ? 'Syncs with your account.' : 'Saved on this computer.'}`}
        >
          <Button type="button" size="sm" onClick={() => setSheetOpen(true)}>
            <MenuIcon path={PALETTE_ICON} />
            Change theme
          </Button>
        </ActionRow>
        <ActionRow label="Custom themes" description="Make your own, or import one someone shared.">
          <Button type="button" variant="secondary" size="sm" onClick={() => void window.api.openExternal(SITE_THEMES_URL)}>
            <MenuIcon path={EXTERNAL_ICON} />
            Create on website
          </Button>
        </ActionRow>
        <SettingRow
          label="Use theme cursor"
          description="Match your cursor to your selected theme. Saved on this computer."
          checked={cursorEnabled}
          onCheckedChange={setCursorEnabled}
        />
        <SettingRow
          label="Theme button in title bar"
          description="Show a button in the title bar that opens these settings. Saved on this computer."
          checked={!shortcutHidden}
          onCheckedChange={(show) => setShortcutHidden(!show)}
        />
        <SettingRow
          label="Use Twemoji"
          description="Render emoji with Twitter's emoji set instead of your system's."
          checked={twemojiEnabled}
          onCheckedChange={setTwemojiEnabled}
        />
      </div>

      {/* Every theme in a side panel, like the website. It stays open on a pick and has no dark
          backdrop, so the app shows each theme as you try it. */}
      <DialogPrimitive.Root
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) setPreviewing(null)
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[1400]" />
          <DialogPrimitive.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right fixed inset-y-0 right-0 z-[1401] flex w-full max-w-lg flex-col border-l border-border-card bg-secondary-bg shadow-2xl outline-none">
            <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4">
              <div>
                <DialogPrimitive.Title className="text-lg font-semibold text-primary-text">Choose a theme</DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm text-secondary-text">
                  Your pick applies right away, so you can see it behind this panel.
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close
                aria-label="Close themes"
                className="flex h-8 w-8 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
              >
                <MenuIcon path={X_ICON} />
              </DialogPrimitive.Close>
            </div>

            <div role="radiogroup" aria-label="Themes" className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pt-1 pb-6">
              <section>
                <SectionHeading>Site themes</SectionHeading>
                <div className="grid grid-cols-2 gap-3">
                  {themes.map((theme) => (
                    <ThemeCard
                      key={theme.slug}
                      theme={theme}
                      checked={!customTheme && applied.slug === theme.slug}
                      onSelect={() => setTheme(theme.slug)}
                    />
                  ))}
                </div>
              </section>

              <section>
                <SectionHeading>Custom themes</SectionHeading>
                {customItems.length > 0 && (
                  <div className="mb-3 grid grid-cols-2 gap-3">
                    {customItems.map(({ theme, own }) => (
                      <CustomThemeMenu
                        key={theme.share_code}
                        theme={theme}
                        own={own}
                        onRemove={() => {
                          if (customTheme?.share_code === theme.share_code) setCustomTheme(null)
                          forgetSharedTheme(theme.share_code)
                        }}
                      >
                        <ThemeCard
                          theme={asSiteTheme(theme)}
                          checked={customTheme?.share_code === theme.share_code}
                          onSelect={() => (own ? setCustomTheme(theme) : applySharedTheme(theme))}
                          badge={own ? 'Custom' : 'Shared'}
                        />
                      </CustomThemeMenu>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value)
                      setError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void importTheme()
                    }}
                    placeholder="Theme code or share link"
                    aria-label="Theme code or share link"
                    className="h-10 min-w-0 flex-1 rounded-xl border border-border-card bg-primary-bg px-3 text-sm text-primary-text placeholder-secondary-text transition-colors focus:border-button-info focus:outline-none"
                  />
                  <Button type="button" variant="secondary" size="sm" className="h-10!" onClick={() => void pasteAndImport()}>
                    Paste
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-10!"
                    onClick={() => void importTheme()}
                    disabled={lookingUp || !input.trim()}
                  >
                    {lookingUp ? 'Loading…' : 'Preview'}
                  </Button>
                </div>
                {error && <p className="mt-1.5 text-xs text-form-error">{error}</p>}
                {previewing && (
                  <SharedThemePreview
                    key={previewing.share_code}
                    theme={previewing}
                    inUse={customTheme?.share_code === previewing.share_code}
                    onUse={() => applyPreviewedTheme(previewing)}
                    onCancel={() => setPreviewing(null)}
                  />
                )}
              </section>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
