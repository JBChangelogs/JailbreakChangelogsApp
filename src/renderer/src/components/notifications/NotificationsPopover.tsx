import { lazy, Suspense, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useSettingsPage } from '@renderer/contexts/SettingsPageContext'
import { useNotificationCount } from '@renderer/hooks/useNotificationCount'
import { notificationsApi } from '@renderer/lib/notificationsApi'
import { formatMessageTimestamp, normalizeToMs } from '@renderer/lib/messageFormatting'
import { useRelativeTime } from '@renderer/hooks/useRelativeTime'
import { isWhitelistedNotificationLink } from '@renderer/lib/notificationUrl'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { Tabs } from '@renderer/components/ui/tabs'
import { Button } from '@renderer/components/ui/button'
import type { NotificationHistory, NotificationItem } from '@shared/notification'

const Markdown = lazy(() => import('@renderer/components/ui/markdown').then((m) => ({ default: m.Markdown })))

const PAGE_SIZE = 5

function BellIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
      />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 3a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h1v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7h1a1 1 0 1 0 0-2h-4V4a1 1 0 0 0-1-1H9Zm1 7a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Zm4 0a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

function ChevronIcon({ className, left = false }: { className?: string; left?: boolean }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={left ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  )
}

function pageItems(page: number, count: number): (number | 'gap-start' | 'gap-end')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
  const siblingsStart = Math.max(Math.min(page, count - 2), 3)
  const siblingsEnd = Math.min(Math.max(page, 3), count - 2)
  const middle = Array.from({ length: siblingsEnd - siblingsStart + 1 }, (_, i) => siblingsStart + i)
  return [
    1,
    siblingsStart > 3 ? 'gap-start' : 2,
    ...middle,
    siblingsEnd < count - 2 ? 'gap-end' : count - 1,
    count
  ]
}

function Pagination({
  page,
  count,
  onChange
}: {
  page: number
  count: number
  onChange: (page: number) => void
}): React.JSX.Element {
  const navButton = 'flex h-8 w-8 items-center justify-center rounded-full text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text disabled:pointer-events-none disabled:opacity-40'
  return (
    <nav className="flex items-center gap-2">
      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className={navButton}>
        <ChevronIcon left className="h-5 w-5" />
      </button>
      <ul className="flex items-center gap-1">
        {pageItems(page, count).map((item) =>
          typeof item === 'number' ? (
            <li key={item}>
              <button
                type="button"
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onChange(item)}
                className={`flex h-8 min-w-8 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors ${item === page ? 'bg-button-info text-form-button-text' : 'text-secondary-text hover:bg-quaternary-bg hover:text-primary-text'
                  }`}
              >
                {item}
              </button>
            </li>
          ) : (
            <li key={item} className="px-1 text-sm text-secondary-text">
              …
            </li>
          )
        )}
      </ul>
      <button type="button" aria-label="Next page" disabled={page >= count} onClick={() => onChange(page + 1)} className={navButton}>
        <ChevronIcon className="h-5 w-5" />
      </button>
    </nav>
  )
}

function NotificationRow({ notif }: { notif: NotificationItem }): React.JSX.Element {
  const unixSeconds = Math.floor(normalizeToMs(notif.last_updated) / 1000)
  const relativeTime = useRelativeTime(unixSeconds)
  const hideAction = notif.title.trim().toLowerCase() === 'login detected'
  const showButton = !hideAction && !!notif.link && isWhitelistedNotificationLink(notif.link)
  const showRawLink = !hideAction && !!notif.link && !isWhitelistedNotificationLink(notif.link)

  return (
    <div className="border-b border-border-secondary px-4 py-3 transition-colors last:border-b-0 hover:bg-secondary-bg">
      <p className="text-sm font-semibold wrap-break-word whitespace-normal text-primary-text">{notif.title}</p>
      {notif.description && (
        <div className="mt-1 text-xs wrap-break-word text-secondary-text">
          <Suspense fallback={<p className="text-xs leading-relaxed">{notif.description}</p>}>
            <Markdown className="text-xs leading-relaxed text-secondary-text [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
              {notif.description}
            </Markdown>
          </Suspense>
        </div>
      )}
      {showButton && (
        <Button size="sm" className="mt-2" onClick={() => void window.api.openExternal(notif.link)}>
          View
        </Button>
      )}
      {showRawLink && <p className="mt-1 text-xs break-all text-secondary-text">{notif.link}</p>}
      <p className="mt-1 text-right text-xs text-secondary-text">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help">{relativeTime ?? 'just now'}</span>
          </TooltipTrigger>
          <TooltipContent>{formatMessageTimestamp(notif.last_updated)}</TooltipContent>
        </Tooltip>
      </p>
    </div>
  )
}

type Tab = 'unread' | 'history'

export function NotificationsPopover(): React.JSX.Element {
  const { token } = useAuth()
  const { count, setCount } = useNotificationCount()
  const { open: openSettings } = useSettingsPage()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('unread')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<NotificationHistory | null>(null)
  const [loading, setLoading] = useState(false)
  const [clearing, setClearing] = useState(false)

  const [error, setError] = useState(false)

  const load = (nextTab: Tab, nextPage: number): void => {
    if (!token) return
    setLoading(true)
    setError(false)
    const request = nextTab === 'unread' ? notificationsApi.unread : notificationsApi.history
    request(token, nextPage, PAGE_SIZE)
      .then((res) => {
        if (nextTab === 'unread' && nextPage > 1 && res.items.length === 0) {
          setPage(nextPage - 1)
          load(nextTab, nextPage - 1)
          return
        }
        setData(res)
        if (nextTab === 'unread' && typeof res.unread_count === 'number') {
          setCount(res.unread_count)
        }
      })
      .catch(() => {
        setData(null)
        setError(true)
      })
      .finally(() => setLoading(false))
  }

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen)
    if (nextOpen) {
      setTab('unread')
      setPage(1)
      load('unread', 1)
    }
  }

  const switchTab = (nextTab: Tab): void => {
    setTab(nextTab)
    setPage(1)
    load(nextTab, 1)
  }

  const goToPage = (nextPage: number): void => {
    setPage(nextPage)
    load(tab, nextPage)
  }

  const handleClearHistory = async (): Promise<void> => {
    if (!token) return
    setClearing(true)
    try {
      await notificationsApi.clearHistory(token)
      load('history', 1)
      setPage(1)
    } catch {
    } finally {
      setClearing(false)
    }
  }

  const total = data?.total ?? 0

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-full w-11 items-center justify-center text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
            >
              <BellIcon className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute top-1.5 right-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-card-tag-bg px-1 text-[9px] font-semibold text-card-tag-text">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="z-[2147483647] w-80 overflow-hidden rounded-2xl p-0">
        <div className="border-b border-border-secondary px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-primary-text">
              {`${total} ${tab === 'unread' ? 'Unread ' : ''}Notification${total !== 1 ? 's' : ''}`}
            </h3>
            {tab === 'history' && total > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => void handleClearHistory()}
                    disabled={clearing}
                    aria-label="Clear history"
                    className="cursor-pointer text-secondary-text transition-colors hover:text-status-error disabled:opacity-50"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Clear History</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="border-b border-border-secondary">
          <Tabs
            value={tab}
            onChange={switchTab}
            className="rounded-none border-0"
            options={[
              { value: 'unread', label: 'Unread' },
              { value: 'history', label: 'History' }
            ]}
          />
        </div>

        <div className="border-b border-border-secondary bg-secondary-bg/30 px-4 py-2">
          <p className="text-xs text-secondary-text">
            Manage which notifications you receive in{' '}
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                openSettings('notifications')
              }}
              className="text-link hover:underline"
            >
              Settings
            </button>
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex min-h-50 flex-col items-center justify-center px-4 py-8">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-border-primary border-t-status-info" />
              <p className="mt-3 text-center text-sm text-secondary-text">Loading notifications...</p>
            </div>
          ) : error ? (
            <p className="px-4 py-8 text-center text-sm text-secondary-text">Could not load notifications. Please try again.</p>
          ) : data && data.items.length > 0 ? (
            <>
              <div className="py-2">
                {data.items.map((notif) => (
                  <NotificationRow key={notif.id} notif={notif} />
                ))}
              </div>
              {data.total_pages > 1 && (
                <div className="flex justify-center border-t border-border-secondary py-3">
                  <Pagination page={page} count={data.total_pages} onChange={goToPage} />
                </div>
              )}
            </>
          ) : (
            <div className="flex min-h-50 flex-col items-center justify-center px-4 py-8">
              <BellIcon className="mb-3 h-12 w-12 text-secondary-text" />
              <p className="text-center text-sm text-secondary-text">No new notifications</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
