import { app } from 'electron'

export const USER_AGENT = `JailbreakChangelogsApp/${app.getVersion()} (${process.platform}; ${process.arch})`

export function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { ...init.headers, 'User-Agent': USER_AGENT, 'X-Application': 'true' }
  })
}
