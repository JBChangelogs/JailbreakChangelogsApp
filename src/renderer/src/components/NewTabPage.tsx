import { useEffect, useRef, useState } from 'react'
import { TAB_INFO } from '@renderer/components/NavBar'
import { HomeAccountBar } from '@renderer/components/AccountPanel'
import { ThemeIcon } from '@renderer/components/ui/theme-icon'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useTheme } from '@renderer/contexts/ThemeContext'
import { useSettingsPage } from '@renderer/contexts/SettingsPageContext'
import { SINGLE_INSTANCE_TABS, TAB_TYPES, useTabs, useTabId, type TabType } from '@renderer/contexts/TabsContext'
import { getItemImagePath, handleImageError } from '@renderer/lib/itemValueUtils'
import { resolveAvatarUrl } from '@renderer/lib/usersApi'
import { fetchSharedTheme } from '@renderer/lib/customThemes'
import { fetchOmniSearch, latestChangelog, OMNI_GROUP_LABELS, type OmniGroup, type OmniResult } from '@renderer/lib/omniSearch'
import { showToast } from '@renderer/lib/toast'

const TOOLS = TAB_TYPES.filter((type) => type !== 'home')
const SITE = 'https://jailbreakchangelogs.com'
const ASSETS = 'https://assets.jailbreakchangelogs.com'
const BANNER_URL = `${ASSETS}/assets/logos/JBCL_Long_Transparent.webp`
const SEARCH_DEBOUNCE_MS = 250
const RESULTS_PER_GROUP = 5

interface Shortcut {
  title: string
  action: () => void
}

interface Row {
  key: string
  title: string
  subtitle?: string
  image?: string | null
  wideImage?: boolean
  round?: boolean
  icon?: string
  node?: React.ReactNode
  shortcuts?: Shortcut[]
  action: () => void
}

function Highlight({ text, query }: { text: string; query: string }): React.JSX.Element {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1
  if (at === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <span className="font-bold text-primary-text">{text.slice(at, at + query.length)}</span>
      {text.slice(at + query.length)}
    </>
  )
}

const settingName = (name: string): string =>
  name.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export function NewTabPage(): React.JSX.Element {
  const { token } = useAuth()
  const { tabs, replace } = useTabs()
  const tabId = useTabId()
  const { setTheme, setCustomTheme, rememberSharedTheme } = useTheme()
  const settings = useSettingsPage()
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<OmniGroup[]>([])
  const [pages, setPages] = useState<Record<string, number>>({})
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)
  const q = query.trim()

  useEffect(() => {
    setActive(-1)
    setPages({})
    if (!token || q.length < 2) {
      setGroups([])
      setSearching(false)
      setError(null)
      return undefined
    }
    const controller = new AbortController()
    setSearching(true)
    const timer = setTimeout(() => {
      fetchOmniSearch(token, q, RESULTS_PER_GROUP, controller.signal)
        .then((result) => {
          setGroups(result)
          setError(null)
        })
        .catch((err: unknown) => {
          if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Search failed')
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false)
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [token, q])

  const showMore = (group: string): void => {
    if (!token) return
    const page = (pages[group] ?? 1) + 1
    fetchOmniSearch(token, q, RESULTS_PER_GROUP, undefined, { group, page })
      .then((result) => {
        const more = result.find((g) => g.group === group)
        if (!more) return
        setPages((prev) => ({ ...prev, [group]: page }))
        setGroups((prev) =>
          prev.map((g) => (g.group === group ? { ...g, results: [...g.results, ...more.results], has_more: more.has_more } : g))
        )
      })
      .catch(() => showToast('Could not load more results.'))
  }

  const tools = TOOLS.filter((type) => {
    const { label, title } = TAB_INFO[type]
    const lower = q.toLowerCase()
    return !lower || label.toLowerCase().includes(lower) || title.toLowerCase().includes(lower)
  })
  const go = (type: TabType): void => replace(tabId, type)
  const web = (path: string): void => void window.api.openExternal(`${SITE}${path}`)
  const changelog = (title: string, id: number | null | undefined): Shortcut[] =>
    id == null ? [] : [{ title, action: () => web(`/changelogs/${id}`) }]

  const openItem = (id: number): void => {
    try {
      localStorage.setItem(`jbcl:tab:${tabId}:values.selectedItem`, JSON.stringify(id))
    } catch {
    }
    go('values')
  }

  const applyTheme = async (result: Extract<OmniResult, { kind: 'theme' }>): Promise<void> => {
    if (!result.custom && result.slug) {
      setCustomTheme(null)
      setTheme(result.slug)
      showToast(`Using ${result.label}`)
      return
    }
    if (!result.share_code) return
    try {
      setCustomTheme(await fetchSharedTheme(result.share_code))
      if (!result.custom) rememberSharedTheme(result.share_code)
      showToast(`Using ${result.label}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load that theme.')
    }
  }

  const toRow = (r: OmniResult, index: number): Row => {
    switch (r.kind) {
      case 'item':
        return {
          key: `item-${r.id}`,
          title: r.name,
          subtitle: r.season != null ? `${r.type} · Season ${r.season}` : r.type,
          image: getItemImagePath(r.type, r.name),
          wideImage: true,
          shortcuts: changelog('Latest changelog', latestChangelog(r)),
          action: () => openItem(r.id)
        }
      case 'user':
        return {
          key: `user-${r.id}`,
          title: r.global_name && r.global_name !== 'None' ? r.global_name : r.username,
          subtitle: `@${r.username}`,
          image: resolveAvatarUrl(r.id, r.avatar),
          round: true,
          action: () => web(`/users/${r.id}`)
        }
      case 'season': {
        const latest = latestChangelog(r)
        return {
          key: `season-${r.season}`,
          title: `Season ${r.season}: ${r.title}`,
          subtitle: r.description,
          icon: 'material-symbols:layers-rounded',
          shortcuts: [
            ...changelog('Launch update', r.launch_changelog_id),
            ...changelog('Latest update', latest === r.launch_changelog_id ? undefined : latest)
          ],
          action: () => web(`/seasons/${r.season}`)
        }
      }
      case 'reward':
        return {
          key: `reward-${r.id}`,
          title: r.item,
          subtitle: `Season ${r.season} · ${r.requirement}`,
          icon: 'material-symbols:layers-rounded',
          action: () => web(`/seasons/${r.season}#reward-${r.id}`)
        }
      case 'changelog':
        return {
          key: `changelog-${r.id}`,
          title: r.title,
          subtitle:
            r.matched === 'body' && r.snippet
              ? r.snippet
              : [
                `Game update ${r.id}`,
                r.launches_season != null ? `Launched Season ${r.launches_season}` : r.season != null && `Season ${r.season}`
              ]
                .filter(Boolean)
                .join(' · '),
          image: r.image_url ? `${ASSETS}${r.image_url}` : null,
          wideImage: true,
          icon: 'material-symbols:article-rounded',
          shortcuts:
            r.season != null
              ? [{ title: r.season_title ? `Season ${r.season}: ${r.season_title}` : `Season ${r.season}`, action: () => web(`/seasons/${r.season}`) }]
              : [],
          action: () => web(`/changelogs/${r.id}`)
        }
      case 'setting':
        return {
          key: `setting-${index}-${r.name}`,
          title: settingName(r.name),
          subtitle: r.description,
          icon: 'material-symbols:settings-rounded',
          action: () => settings.open()
        }
      case 'server':
        return {
          key: `server-${r.id}`,
          title: `${r.owner.global_name || r.owner.username}'s server`,
          subtitle: r.rules && r.rules !== 'N/A' ? r.rules : 'No rules listed',
          icon: 'material-symbols:dns-rounded',
          shortcuts: [{ title: 'Join', action: () => void window.api.openExternal(r.link) }],
          action: () => go('servers')
        }
      case 'theme':
        return {
          key: `theme-${r.share_code ?? r.slug ?? index}`,
          title: r.label,
          subtitle: r.custom ? `Your ${r.scheme} theme` : `${r.scheme === 'light' ? 'Light' : 'Dark'} theme`,
          icon: r.icon ?? (r.scheme === 'light' ? 'lucide:sun' : 'lucide:moon'),
          action: () => void applyTheme(r)
        }
    }
  }

  const toolRows: Row[] = q
    ? tools.map((type) => {
        const { title, Icon } = TAB_INFO[type]
        const open = SINGLE_INSTANCE_TABS.has(type) && tabs.some((tab) => tab.type === type)
        return { key: `tool-${type}`, title, subtitle: open ? 'Already open' : 'Tool', node: <Icon />, action: () => go(type) }
      })
    : []
  const sections = [
    ...(toolRows.length ? [{ group: 'tools', label: 'Tools', hasMore: false, rows: toolRows }] : []),
    ...groups.map((g) => ({
      group: g.group,
      label: OMNI_GROUP_LABELS[g.group] ?? g.group,
      hasMore: g.has_more,
      rows: g.results.map(toRow)
    }))
  ]
  const open = q.length >= 2
  const flat = sections.flatMap((s) => s.rows)

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown' && flat.length) {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp' && flat.length) {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setQuery('')
    }
  }

  let rowIndex = -1
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 pt-[14vh] pb-10">
      <div className="absolute top-3 right-4">
        <HomeAccountBar />
      </div>
      <h1 className="mb-8 w-full max-w-md">
        <img src={BANNER_URL} alt="Jailbreak Changelogs" className="w-full" draggable={false} />
      </h1>
      <div className="relative z-20 mb-8 w-full max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          flat[Math.max(active, 0)]?.action()
        }}
      >
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search Jailbreak Changelogs"
          aria-label="Search"
          className={`h-12 w-full border border-border-card bg-secondary-bg px-5 text-base text-primary-text placeholder-secondary-text outline-none ${
            open ? 'rounded-t-3xl border-b-transparent shadow-lg' : 'rounded-full shadow-sm focus:border-button-info'
          }`}
        />
      </form>
      {open && (
        <div
          ref={listRef}
          className="absolute inset-x-0 top-full max-h-[60vh] overflow-y-auto rounded-b-3xl border border-t-0 border-border-card bg-secondary-bg px-2 pb-2 shadow-lg"
          aria-live="polite"
          aria-busy={searching}
        >
          <div className="mx-3 mb-1 border-t border-border-card" />
          {error ? (
            <p className="px-3 py-4 text-center text-sm text-form-error">{error}</p>
          ) : sections.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-secondary-text">
              {searching ? 'Searching…' : `Nothing matches “${q}”.`}
            </p>
          ) : (
            sections.map((section) => (
              <section key={section.group} className="mb-2 last:mb-0">
                <h2 className="px-3 pt-2 pb-1 text-xs font-medium text-tertiary-text">{section.label}</h2>
                {section.rows.map((row) => {
                  rowIndex += 1
                  const index = rowIndex
                  const isActive = index === active
                  return (
                    <div
                      key={row.key}
                      data-active={isActive}
                      onMouseEnter={() => setActive(index)}
                      className={`group/row flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${isActive ? 'bg-tertiary-bg' : ''}`}
                    >
                      <button type="button" onClick={row.action} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        {row.image ? (
                          <img
                            src={row.image}
                            alt=""
                            onError={handleImageError}
                            draggable={false}
                            className={`shrink-0 object-cover ${row.wideImage ? 'h-10 w-[4.5rem] rounded-md' : 'h-9 w-9'} ${row.round ? 'rounded-full' : 'rounded-md'}`}
                          />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center text-secondary-text [&_svg]:h-5 [&_svg]:w-5">
                            {row.node ?? (row.icon && <ThemeIcon icon={row.icon} className="size-5" />)}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-primary-text/90">
                            <Highlight text={row.title} query={q} />
                          </span>
                          {row.subtitle && <span className="block truncate text-xs text-secondary-text">{row.subtitle}</span>}
                        </span>
                      </button>
                      {isActive && row.shortcuts?.length ? (
                        <span className="flex shrink-0 gap-1.5">
                          {row.shortcuts.map((s) => (
                            <button
                              key={s.title}
                              type="button"
                              onClick={s.action}
                              className="rounded-full bg-button-secondary px-3 py-1.5 text-xs font-semibold text-primary-text transition-colors hover:bg-button-secondary-hover"
                            >
                              {s.title}
                            </button>
                          ))}
                        </span>
                      ) : (
                        <span
                          aria-hidden="true"
                          className={`shrink-0 text-xs text-tertiary-text transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`}
                        >
                          Open ›
                        </span>
                      )}
                    </div>
                  )
                })}
                {section.hasMore && (
                  <button
                    type="button"
                    onClick={() => showMore(section.group)}
                    className="mt-0.5 ml-3 text-xs text-link hover:underline"
                  >
                    Show more
                  </button>
                )}
              </section>
            ))
          )}
        </div>
      )}
      </div>

      <div className="grid w-full max-w-3xl grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3">
          {TOOLS.map((type) => {
            const { label, Icon } = TAB_INFO[type]
            const open = SINGLE_INSTANCE_TABS.has(type) && tabs.some((tab) => tab.type === type)
            return (
              <button
                key={type}
                type="button"
                onClick={() => go(type)}
                className="group flex flex-col items-center gap-2.5 rounded-2xl p-4 text-center transition-colors hover:bg-secondary-bg focus-visible:bg-secondary-bg focus-visible:outline-none"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tertiary-bg text-secondary-text transition-colors group-hover:text-button-info [&_svg]:h-5 [&_svg]:w-5">
                  <Icon />
                </span>
                <span className="text-sm text-primary-text">{label}</span>
                {open && <span className="-mt-2 text-[10px] text-tertiary-text">Open</span>}
              </button>
            )
          })}
      </div>

    </div>
  )
}
