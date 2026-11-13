import { useEffect, useState } from 'react'
import { useTheme } from '@renderer/contexts/ThemeContext'
import { useSettingsPage } from '@renderer/contexts/SettingsPageContext'
import { Button } from '@renderer/components/ui/button'
import { SearchInput } from '@renderer/components/ui/search-input'
import { ThemeIcon } from '@renderer/components/ui/theme-icon'
import { FilterMenu } from '@renderer/components/tracker/FilterMenus'
import { SharedThemePreview, ThemePreview } from '@renderer/components/settings/sections/DisplaySettingsSection'
import { UserSearch } from '@renderer/components/messages/UserSearch'
import { UserAvatar } from '@renderer/components/messages/UserAvatar'
import { profileDisplayName } from '@renderer/components/messages/GroupChatDialogs'
import type { UserProfile } from '@shared/user'
import { showToast } from '@renderer/lib/toast'
import {
  DEFAULT_MARKETPLACE_SORTS,
  asSiteTheme,
  fetchMarketplaceFilters,
  fetchMarketplaceSorts,
  fetchMarketplaceThemes,
  type MarketplaceFilterGroup,
  type MarketplacePage,
  type MarketplaceTheme
} from '@renderer/lib/customThemes'

function CheckIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

export function ThemeMarketplaceSection(): React.JSX.Element {
  const { customTheme, setCustomTheme, rememberSharedTheme } = useTheme()
  const { setSection } = useSettingsPage()
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [sorts, setSorts] = useState(DEFAULT_MARKETPLACE_SORTS)
  const [sort, setSort] = useState('newest')
  const [filterGroups, setFilterGroups] = useState<MarketplaceFilterGroup[]>([])
  const [filters, setFilters] = useState<string[]>([])
  const [creator, setCreator] = useState<UserProfile | null>(null)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<MarketplacePage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<MarketplaceTheme | null>(null)
  const inUse = customTheme?.share_code ?? null

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(input.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [input])

  useEffect(() => {
    fetchMarketplaceSorts()
      .then(setSorts)
      .catch(() => {})
    fetchMarketplaceFilters()
      .then(setFilterGroups)
      .catch(() => {})
  }, [])

  const toggleFilter = (value: string): void => {
    setFilters((prev) => (prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]))
    setPage(1)
  }

  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    fetchMarketplaceThemes(page, sort, query, filters, creator?.id ?? null, controller.signal)
      .then(setData)
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not load themes.')
      })
    return () => controller.abort()
  }, [page, sort, query, filters, creator])

  const use = (theme: MarketplaceTheme): void => {
    setCustomTheme(theme)
    rememberSharedTheme(theme.share_code)
    setSelected(null)
    showToast(`Using ${theme.label}`, { description: 'Pick another theme in Settings anytime.' })
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary-text">Theme Marketplace</h1>
          <p className="mt-1 text-sm text-secondary-text">Themes the community has published. Try one on before you use it.</p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={() => setSection('display')}>
          Your themes
        </Button>
      </div>

      <div className="sticky top-0 z-10 -mx-2 mb-1 bg-primary-bg px-2 py-3">
        <div className="relative z-30 flex gap-2">
          <SearchInput value={input} onChange={setInput} placeholder="Search by name, author or code..." className="min-w-0 flex-1" />
          <div className="w-64 shrink-0">
            {creator ? (
              <div className="flex h-10 items-center gap-2 rounded-xl border border-button-info/50 bg-secondary-bg pr-1.5 pl-2">
                <UserAvatar id={creator.id} profile={creator} className="h-6 w-6" />
                <span className="min-w-0 flex-1 truncate text-sm text-primary-text">
                  Themes by <span className="font-semibold">{profileDisplayName(creator) ?? creator.username}</span>
                </span>
                <button
                  type="button"
                  aria-label="Show themes by everyone"
                  onClick={() => {
                    setCreator(null)
                    setPage(1)
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <UserSearch
                placeholder="Find a creator"
                onSelect={(user) => {
                  setCreator(user)
                  setPage(1)
                }}
              />
            )}
          </div>
          <div className="w-52 shrink-0">
            <FilterMenu
              label="Sort"
              value={sort}
              options={sorts}
              onChange={(value) => {
                setSort(value)
                setPage(1)
              }}
            />
          </div>
        </div>
        {filterGroups.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            {filterGroups.map((group) => (
              <div key={group.group} role="group" aria-label={group.group} className="flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 text-xs font-medium text-tertiary-text">{group.group}</span>
                {group.filters.map((f) => {
                  const on = filters.includes(f.value)
                  return (
                    <button
                      key={f.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleFilter(f.value)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors ${
                        on
                          ? 'border-transparent bg-button-info text-form-button-text'
                          : 'border-border-card bg-secondary-bg text-secondary-text hover:border-button-info/50 hover:text-primary-text'
                      }`}
                    >
                      {on && <CheckIcon className="h-3 w-3" />}
                      {f.label}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-full h-6 bg-gradient-to-b from-primary-bg to-transparent" />
        {selected && (
          <div className="absolute inset-x-2 top-full z-20 -mt-3 drop-shadow-2xl before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-8 before:bg-primary-bg">
            <SharedThemePreview
              key={selected.share_code}
              theme={selected}
              inUse={inUse === selected.share_code}
              onUse={() => use(selected)}
              onCancel={() => setSelected(null)}
            />
          </div>
        )}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-form-error">
          {error}
        </p>
      ) : !data ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-secondary-bg" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-secondary-text">
          {creator
            ? `${profileDisplayName(creator) ?? creator.username} hasn't published any${query ? ' matching' : ''} themes.`
            : query
              ? `No themes match "${query}".`
              : 'No themes published yet.'}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
          {data.items.map((theme) => (
            <button
              key={theme.share_code}
              type="button"
              onClick={() => setSelected(theme)}
              aria-pressed={selected?.share_code === theme.share_code}
              className={`flex flex-col overflow-hidden rounded-xl border text-left transition-colors ${
                selected?.share_code === theme.share_code ? 'border-button-info' : 'border-border-card hover:border-button-info/50'
              }`}
            >
              <ThemePreview theme={asSiteTheme(theme)} />
              <span className="block flex-1 bg-secondary-bg p-3">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-primary-text">
                  <ThemeIcon icon={theme.icon ?? 'lucide:palette'} className="size-4 shrink-0" />
                  <span className="truncate">{theme.label}</span>
                  {inUse === theme.share_code && (
                    <span className="ml-auto shrink-0 text-[10px] font-semibold text-button-info uppercase">In use</span>
                  )}
                </span>
                {theme.description && <span className="mt-1 line-clamp-3 block text-xs text-secondary-text">{theme.description}</span>}
                <span className="mt-1.5 block truncate text-xs text-tertiary-text">by {theme.author}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {data && data.total_pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button type="button" size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-xs text-secondary-text">
            Page {data.page} of {data.total_pages}
          </span>
          <Button type="button" size="sm" variant="secondary" disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
