const API_HOSTS = ['api.jailbreakchangelogs.com', 'inventories.jailbreakchangelogs.com']

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
    const response = await originalFetch(input, init)
    if (response.status === 401 && API_HOSTS.some((host) => requestUrl(input).includes(host))) {
      reportUnauthorized()
    }
    return response
  }
}
