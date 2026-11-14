import type { DesktopApi } from '@shared/desktopApi'

const API = 'https://api.jailbreakchangelogs.com'
const SESSION = 'web-session'
const DEV_TOKEN_KEY = 'jbcl_dev_token'

const noop = (): void => {}
const none = (): (() => void) => noop

function devToken(): string | null {
  if (location.hostname !== 'localhost') return null
  try {
    return localStorage.getItem(DEV_TOKEN_KEY)
  } catch {
    return null
  }
}

const notificationClicks = new Set<(id: string) => void>()

function makeApi(nativeFetch: typeof fetch): DesktopApi {
  return {
    platform: 'web',
    openExternal: async (url) => void window.open(url, '_blank', 'noopener,noreferrer'),
    onProtocolUrl: none,
    takePendingProtocolUrls: async () => [],
    window: {
      minimize: noop,
      toggleMaximize: noop,
      close: noop,
      isMaximized: async () => false,
      onMaximizedChange: none
    },
    auth: {
      login: async () => {
        location.href = `${API}/oauth?redirect=${encodeURIComponent(`${location.origin}/auth/callback`)}`
      },
      getToken: async () => {
        const dev = devToken()
        if (dev) return dev
        const res = await nativeFetch(`${API}/v2/users/me`, {
          credentials: 'include',
          headers: { 'X-Application': 'true' }
        }).catch(() => null)
        return res?.ok ? SESSION : null
      },
      logout: () => {
        void nativeFetch(`${API}/v2/users/me/session`, { method: 'DELETE', credentials: 'include' }).catch(noop)
      },
      onLoginSuccess: none,
      onLoginError: none
    },
    updater: { quitAndInstall: noop, checkNow: noop, download: noop, onStatus: none },
    notifications: {
      show: async ({ id, title, body }) => {
        if (!('Notification' in window)) return
        if (Notification.permission === 'default') await Notification.requestPermission()
        if (Notification.permission !== 'granted') return
        const n = new Notification(title, { body, tag: id })
        n.onclick = () => {
          window.focus()
          for (const cb of notificationClicks) cb(id)
        }
      },
      onClick: (callback) => {
        notificationClicks.add(callback)
        return () => void notificationClicks.delete(callback)
      }
    },
    onRobloxActivityChanged: none,
    robloxGameIcons: async () => ({}),
    messageImages: {
      bytes: async (url) => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Image unavailable (${res.status})`)
        return res.arrayBuffer()
      },
      save: async (url) => {
        const name = `jbcl-${url.split('/').pop()?.split('.')[0] || 'image'}.webp`
        try {
          const res = await fetch(url)
          if (!res.ok) throw new Error()
          const href = URL.createObjectURL(await res.blob())
          Object.assign(document.createElement('a'), { href, download: name }).click()
          setTimeout(() => URL.revokeObjectURL(href), 1000)
        } catch {
          window.open(url, '_blank', 'noopener,noreferrer')
        }
        return name
      }
    },
    scanner: {
      status: async () => ({ available: false, reason: 'Trade scanning is only available in the desktop app.' }),
      install: async () => ({ available: false, reason: 'Trade scanning is only available in the desktop app.' }),
      onInstallProgress: none,
      snip: async () => null,
      getAuto: async () => ({ enabled: false }),
      setAutoEnabled: async () => ({ enabled: false }),
      onAutoResult: none
    },
    analytics: { track: noop, isEnabled: async () => false, setEnabled: noop },
    discordRpc: { setPreference: noop },
    uninstall: { supported: async () => false, run: async () => {} }
  }
}

function useCookieSession(): void {
  const innerFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (!url.startsWith(`${API}/`)) return innerFetch(input, init)
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    headers.set('X-Application', 'true')
    if (headers.get('Authorization') !== SESSION) return innerFetch(input, { ...init, headers })
    headers.delete('Authorization')
    return innerFetch(input, { ...init, headers, credentials: 'include' })
  }

  const NativeSocket = window.WebSocket
  window.WebSocket = class extends NativeSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      const u = new URL(url)
      if (u.searchParams.get('token') === SESSION) u.searchParams.delete('token')
      super(u, protocols)
    }
  }
}

export function install(nativeFetch: typeof fetch): void {
  if (location.pathname === '/auth/callback') history.replaceState(null, '', '/')
  window.api = makeApi(nativeFetch)
  useCookieSession()
}
