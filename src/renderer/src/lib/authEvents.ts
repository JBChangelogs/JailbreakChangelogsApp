const INVENTORY_HOST = 'inventories.jailbreakchangelogs.com'
const API_HOSTS = ['api.jailbreakchangelogs.com', INVENTORY_HOST]

let inventoryToken: string | null = null

export function setInventoryToken(token: string | null): void {
  inventoryToken = token
}

type Listener = () => void
const listeners = new Set<Listener>()

export function onUnauthorized(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function reportUnauthorized(): void {
  for (const listener of listeners) listener()
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

declare global {
  interface Window {
    __authEventsPatched?: boolean
  }
}

if (!window.__authEventsPatched) {
  window.__authEventsPatched = true
  const originalFetch = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (inventoryToken && requestUrl(input).includes(INVENTORY_HOST)) {
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
      if (!headers.has('Authorization')) headers.set('Authorization', inventoryToken)
      init = { ...init, headers }
    }
    const response = await originalFetch(input, init)
    if (response.status === 401 && API_HOSTS.some((host) => requestUrl(input).includes(host))) {
      reportUnauthorized()
    }
    return response
  }
}
