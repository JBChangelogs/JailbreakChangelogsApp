import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useTabState } from '@renderer/contexts/TabsContext'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { serversApi } from '@renderer/lib/serversApi'
import { showToast } from '@renderer/lib/toast'
import { track } from '@renderer/lib/analytics'
import { SidebarHeader } from '@renderer/components/ui/sidebar-header'
import { SearchInput } from '@renderer/components/ui/search-input'
import { FilterMenu } from '@renderer/components/tracker/FilterMenus'
import { Button } from '@renderer/components/ui/button'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { UserAvatar } from '@renderer/components/messages/UserAvatar'
import { profileDisplayName } from '@renderer/components/messages/GroupChatDialogs'
import {
  displayRules,
  minExpiryDate,
  normaliseRules,
  parseServerTimestamp,
  toExpiresField,
  validateServerExpiry,
  validateServerLink,
  validateServerRules,
  type VipServerPage,
  type VipServerWithOwner
} from '@shared/servers'

const SEARCH_DEBOUNCE_MS = 300
const INPUT =
  'w-full rounded-lg border border-border-card bg-secondary-bg px-3 py-2 text-sm text-primary-text placeholder-secondary-text outline-none focus:border-button-info'

type ListState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: VipServerPage }

interface ServersState {
  list: ListState
  query: string
  setQuery: (query: string) => void
  sort: string | null
  setSort: (sort: string) => void
  sorts: { value: string; label: string }[]
  page: number
  setPage: (page: number) => void
  reload: () => void
  editing: VipServerWithOwner | 'new' | null
  setEditing: (server: VipServerWithOwner | 'new' | null) => void
}

const ServersContext = createContext<ServersState | null>(null)

function useServers(): ServersState {
  const value = useContext(ServersContext)
  if (!value) throw new Error('useServers must be used inside PrivateServersProvider')
  return value
}

const errorMessage = (err: unknown, fallback: string): string => (err instanceof Error ? err.message : fallback)

export function PrivateServersProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { token } = useAuth()
  const [query, setQueryRaw] = useTabState('servers.query', '')
  const [debounced, setDebounced] = useState(query)
  const [sort, setSort] = useTabState<string | null>('servers.sort', null)
  const [sorts, setSorts] = useState<{ value: string; label: string }[]>([])
  const [page, setPage] = useState(1)
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<VipServerWithOwner | 'new' | null>(null)

  useEffect(() => {
    serversApi
      .sorts()
      .then(setSorts)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    setList((prev) => (prev.status === 'ready' ? prev : { status: 'loading' }))
    serversApi
      .list(token, page, debounced, sort)
      .then((data) => {
        if (cancelled) return
        if (data.total_pages > 0 && page > data.total_pages) setPage(data.total_pages)
        else setList({ status: 'ready', data })
      })
      .catch((err) => {
        if (!cancelled) setList({ status: 'error', message: errorMessage(err, 'Failed to load servers.') })
      })
    return () => {
      cancelled = true
    }
  }, [token, page, debounced, sort, reloadKey])

  const setQuery = (value: string): void => {
    setQueryRaw(value)
    setPage(1)
  }
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return (
    <ServersContext.Provider
      value={{
        list,
        query,
        setQuery,
        sort: sort ?? sorts[0]?.value ?? null,
        setSort: (value) => {
          setSort(value)
          setPage(1)
        },
        sorts,
        page,
        setPage,
        reload,
        editing,
        setEditing
      }}
    >
      {children}
    </ServersContext.Provider>
  )
}

export function PrivateServersSidebar(): React.JSX.Element {
  const { query, setQuery, sort, setSort, sorts, setEditing } = useServers()
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <SidebarHeader>
        <SearchInput value={query} onChange={setQuery} placeholder="Search servers..." />
      </SidebarHeader>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2">
        <Button type="button" className="w-full text-sm!" onClick={() => setEditing('new')}>
          Add server
        </Button>
        {sort && sorts.length > 0 && <FilterMenu label="Sort" value={sort} options={sorts} onChange={setSort} />}
        <p className="px-1 text-xs text-secondary-text">
          Private servers shared by the community. Looking for public servers? Check the robbery and bounty trackers.
        </p>
      </div>
    </div>
  )
}

function formatDate(ms: number | null): string {
  return ms == null ? 'Never' : new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function ServerCard({ server, number }: { server: VipServerWithOwner; number: number }): React.JSX.Element {
  const { token } = useAuth()
  const { user } = useCurrentUser()
  const { setEditing, reload } = useServers()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [reporting, setReporting] = useState(false)
  const isOwner = user?.id === server.user.id
  const rules = displayRules(server.rules)
  const name = profileDisplayName(server.user) ?? server.user.username
  const premium = server.user.premiumtype ?? 0

  const remove = async (): Promise<void> => {
    if (!token) return
    setConfirmDelete(false)
    try {
      await serversApi.remove(token, server.id)
      showToast('Server deleted')
      reload()
    } catch (err) {
      showToast(errorMessage(err, 'Failed to delete the server.'))
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-border-card bg-tertiary-bg p-4">
      <div className="mb-3 flex items-center gap-3">
        <UserAvatar id={server.user.id} profile={server.user} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-primary-text">
            {name}
            {premium >= 1 && premium <= 3 && (
              <img
                src={`https://assets.jailbreakchangelogs.com/assets/website_icons/jbcl_supporter_${premium}.svg`}
                alt={`Supporter ${premium}`}
                className="h-4 w-4"
              />
            )}
          </p>
          <p className="text-xs text-secondary-text">Server #{number}</p>
        </div>
        {isOwner ? (
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(server)}>
              Edit
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </div>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={() => setReporting(true)}>
            Report
          </Button>
        )}
      </div>

      <p className={`mb-3 flex-1 text-sm break-words whitespace-pre-line ${rules ? 'text-primary-text' : 'text-secondary-text italic'}`}>
        {rules ?? 'No rules set by owner'}
      </p>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-secondary-text">
        <span>Created {formatDate(parseServerTimestamp(server.created_at))}</span>
        <span>Expires {formatDate(parseServerTimestamp(server.expires))}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(server.link)
            showToast('Server link copied')
          }}
        >
          Copy link
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            track('server_join_click', { source: 'servers_tab' })
            void window.api.openExternal(server.link)
          }}
        >
          Join server
        </Button>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this server?</DialogTitle>
          </DialogHeader>
          <p className="px-5 py-4 text-sm text-secondary-text">It will be removed from the list for everyone.</p>
          <div className="flex justify-end gap-2 border-t border-border-primary p-5">
            <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => void remove()}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReportDialog serverId={server.id} open={reporting} onOpenChange={setReporting} />
    </div>
  )
}

function ReportDialog({
  serverId,
  open,
  onOpenChange
}: {
  serverId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}): React.JSX.Element {
  const { token } = useAuth()
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (): Promise<void> => {
    const trimmed = reason.trim()
    if (!token || !trimmed) return
    setSending(true)
    try {
      await serversApi.report(token, serverId, trimmed)
      showToast('Report submitted')
      setReason('')
      onOpenChange(false)
    } catch (err) {
      const code = (err as { code?: string; status?: number }).code
      const status = (err as { status?: number }).status
      showToast(
        code === 'report_exists'
          ? 'You have already reported this server.'
          : code === 'self_report'
            ? 'You cannot report your own server.'
            : status === 404
              ? 'This server is no longer available.'
              : errorMessage(err, 'Failed to submit the report.')
      )
      if (code === 'report_exists' || status === 404) onOpenChange(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report server</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What's wrong with this server?"
            rows={4}
            maxLength={500}
            className={INPUT}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-border-primary p-5">
          <Button type="button" size="sm" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={sending || !reason.trim()} onClick={() => void submit()}>
            {sending ? 'Sending…' : 'Submit report'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const toLocalInput = (date: Date): string => {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function ServerFormDialog(): React.JSX.Element {
  const { token } = useAuth()
  const { editing, setEditing, reload } = useServers()
  const existing = editing && editing !== 'new' ? editing : null
  const [link, setLink] = useState('')
  const [rules, setRules] = useState('')
  const [never, setNever] = useState(true)
  const [expires, setExpires] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) return
    const expiresMs = existing ? parseServerTimestamp(existing.expires) : null
    setLink(existing?.link ?? '')
    setRules(existing && existing.rules !== 'N/A' ? existing.rules : '')
    setNever(expiresMs == null)
    setExpires(expiresMs != null ? toLocalInput(new Date(expiresMs)) : toLocalInput(minExpiryDate()))
    setError(null)
  }, [editing])

  const submit = async (): Promise<void> => {
    if (!token) return
    const expiresMs = never ? null : new Date(expires).getTime()
    const problem = validateServerLink(link) ?? validateServerRules(rules) ?? validateServerExpiry(expiresMs)
    if (problem) {
      setError(problem)
      return
    }
    const payload = { link: link.trim(), rules: normaliseRules(rules), expires: toExpiresField(expiresMs) }
    if (
      existing &&
      payload.link === existing.link &&
      payload.rules === existing.rules &&
      payload.expires === toExpiresField(parseServerTimestamp(existing.expires))
    ) {
      setEditing(null)
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (existing) await serversApi.update(token, existing.id, payload)
      else await serversApi.create(token, payload)
      showToast(existing ? 'Server updated' : 'Server added')
      setEditing(null)
      reload()
    } catch (err) {
      setError(errorMessage(err, 'Failed to save the server.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit server' : 'Add server'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4 px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-secondary-text">Server link</span>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://www.roblox.com/share?code=..."
              className={INPUT}
            />
          </label>
          <label className="block">
            <span className="mb-1 flex justify-between text-xs font-semibold text-secondary-text">
              Rules
              <span className={rules.length > 200 ? 'text-status-error' : ''}>{rules.length}/200</span>
            </span>
            <textarea value={rules} onChange={(e) => setRules(e.target.value)} rows={4} placeholder="Optional" className={INPUT} />
          </label>
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm text-primary-text">
              <input type="checkbox" checked={never} onChange={(e) => setNever(e.target.checked)} className="accent-button-info" />
              Never expires
            </label>
            {!never && (
              <input
                type="datetime-local"
                value={expires}
                min={toLocalInput(minExpiryDate())}
                onChange={(e) => setExpires(e.target.value)}
                className={INPUT}
              />
            )}
          </div>
          {error && (
            <p role="alert" className="rounded-lg border border-status-error/30 bg-status-error/10 p-3 text-sm text-status-error">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving…' : existing ? 'Save changes' : 'Add server'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function PrivateServersScreen(): React.JSX.Element {
  const { list, page, setPage, query, reload } = useServers()
  const data = list.status === 'ready' ? list.data : null

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex h-[57px] shrink-0 items-center justify-between border-b border-border-primary px-5">
        <h2 className="text-sm font-semibold text-primary-text">Private Servers</h2>
        {data && <span className="text-xs text-tertiary-text">{data.total.toLocaleString()} servers</span>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {list.status === 'loading' && (
          <EmptyState status={{ icon: 'spinner', tone: 'neutral', title: 'Loading servers', description: 'Fetching private servers.' }} />
        )}
        {list.status === 'error' && (
          <EmptyState
            status={{
              icon: 'signalSlash',
              tone: 'error',
              title: "Couldn't load servers",
              description: list.message,
              action: { label: 'Try again', onClick: reload }
            }}
          />
        )}
        {data &&
          (data.items.length === 0 ? (
            <EmptyState
              status={{
                icon: 'search',
                tone: 'neutral',
                title: query ? 'No servers match your search' : 'No servers yet',
                description: query ? 'Try a different search.' : 'Add your private server from the sidebar.'
              }}
            />
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                {data.items.map((server, index) => (
                  <ServerCard key={server.id} server={server} number={data.total - (data.page - 1) * data.size - index} />
                ))}
              </div>
              {data.total_pages > 1 && (
                <div className="mt-5 flex items-center justify-center gap-3">
                  <Button type="button" size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Previous
                  </Button>
                  <span className="text-xs text-secondary-text">
                    Page {data.page} of {data.total_pages}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={page >= data.total_pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ))}
      </div>

      <ServerFormDialog />
    </div>
  )
}
