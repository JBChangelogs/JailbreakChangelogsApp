import { useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useSettingsPage } from '@renderer/contexts/SettingsPageContext'
import { useNotificationCount } from '@renderer/hooks/useNotificationCount'
import { notificationsApi } from '@renderer/lib/notificationsApi'
import { formatMessageTimestamp } from '@renderer/lib/messageFormatting'
import { isWhitelistedNotificationLink } from '@renderer/lib/notificationUrl'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { Markdown } from '@renderer/components/ui/markdown'
import type { NotificationHistory, NotificationItem } from '@shared/notification'

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

function CheckCheckIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 7 17l-5-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m22 10-7.5 7.5L13 16" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z"
      />
    </svg>
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

  const load = (nextTab: Tab, nextPage: number): void => {
    if (!token) return
    setLoading(true)
    const request = nextTab === 'unread' ? notificationsApi.unread : notificationsApi.history
    request(token, nextPage, PAGE_SIZE)
      .then((res) => {
        setData(res)
        if (nextTab === 'unread' && typeof res.unread_count === 'number') {
          setCount(res.unread_count)
        }
      })
      .catch(() => setData(null))
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

  const handleMarkAllRead = async (): Promise<void> => {
    if (!token) return
    setClearing(true)
    try {
      await notificationsApi.markAllRead(token)
      setCount(0)
      load('unread', 1)
      setPage(1)
    } catch {
    } finally {
      setClearing(false)
    }
  }

  const renderItem = (notif: NotificationItem): React.JSX.Element => {
    const hideAction = notif.title.trim().toLowerCase() === 'login detected'
    const showButton = !hideAction && !!notif.link && isWhitelistedNotificationLink(notif.link)
    const showRawLink = !hideAction && !!notif.link && !isWhitelistedNotificationLink(notif.link)

    return (
      <div
        key={notif.id}
        className="border-b border-border-primary px-4 py-3 transition-colors last:border-b-0 hover:bg-quaternary-bg/50"
      >
        <p className="text-sm font-semibold text-primary-text">{notif.title}</p>
        {notif.description && (
          <Markdown className="mt-1 text-xs [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
            {notif.description}
          </Markdown>
        )}
        {showRawLink && <p className="mt-1 text-xs break-all text-quaternary-text">{notif.link}</p>}
        <div className="mt-2 flex items-center justify-between gap-2">
          {showButton ? (
            <button
              type="button"
              onClick={() => void window.api.openExternal(notif.link)}
              className="rounded-md bg-button-info/10 px-2 py-1 text-xs font-semibold text-link transition-colors hover:bg-button-info/20 hover:text-link-hover"
            >
              View
            </button>
          ) : (
            <span />
          )}
          <span className="text-[11px] text-quaternary-text">{formatMessageTimestamp(notif.last_updated)}</span>
        </div>
      </div>
    )
  }

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

      <PopoverContent align="end" sideOffset={8} className="z-[2147483647] w-80 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border-primary bg-secondary-bg px-4 py-3">
          <h3 className="text-sm font-semibold text-primary-text">
            {data ? `${data.total} ${tab === 'unread' ? 'Unread ' : ''}Notification${data.total !== 1 ? 's' : ''}` : 'Notifications'}
          </h3>
          {tab === 'unread' && data && data.total > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  disabled={clearing}
                  aria-label="Mark all as read"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text disabled:opacity-50"
                >
                  <CheckCheckIcon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Mark All Read</TooltipContent>
            </Tooltip>
          )}
          {tab === 'history' && data && data.total > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => void handleClearHistory()}
                  disabled={clearing}
                  aria-label="Clear history"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-status-error/10 hover:text-status-error disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Clear History</TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="relative flex bg-secondary-bg">
          {(['unread', 'history'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => switchTab(value)}
              className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === value
                  ? 'text-primary-text'
                  : 'text-secondary-text hover:bg-quaternary-bg hover:text-primary-text'
              }`}
            >
              {value === 'unread' ? 'Unread' : 'History'}
            </button>
          ))}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border-primary/60" />
          <div
            className={`pointer-events-none absolute bottom-0 h-0.5 w-1/2 bg-border-focus transition-transform duration-200 ease-out ${
              tab === 'history' ? 'translate-x-full' : 'translate-x-0'
            }`}
          />
        </div>

        <div className="border-b border-border-primary bg-secondary-bg/30 px-4 py-2">
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
            <p className="px-4 py-8 text-center text-sm text-quaternary-text">Loading…</p>
          ) : data && data.items.length > 0 ? (
            data.items.map(renderItem)
          ) : (
            <p className="px-4 py-8 text-center text-sm text-quaternary-text">
              {tab === 'unread' ? 'No new notifications' : 'No notification history'}
            </p>
          )}
        </div>

        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-border-primary px-4 py-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="text-xs font-semibold text-link hover:text-link-hover disabled:pointer-events-none disabled:text-tertiary-text"
            >
              Previous
            </button>
            <span className="text-[11px] text-quaternary-text">
              Page {page} of {data.total_pages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= data.total_pages}
              className="text-xs font-semibold text-link hover:text-link-hover disabled:pointer-events-none disabled:text-tertiary-text"
            >
              Next
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
