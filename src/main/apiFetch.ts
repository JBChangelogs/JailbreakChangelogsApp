const USER_AGENT = 'JailbreakChangelogsApp'

export function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { ...init.headers, 'User-Agent': USER_AGENT }
  })
}
