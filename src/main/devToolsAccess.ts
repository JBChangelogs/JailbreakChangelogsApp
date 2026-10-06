import { loadToken } from './auth'
import { apiFetch } from './apiFetch'

const PRIVILEGED_FLAGS = ['is_developer', 'is_owner', 'is_tester', 'website_moderator']

interface UserFlag {
  flag: string
  enabled: boolean
}

let cached: { token: string; allowed: boolean } | null = null

export function isDevToolsAllowed(): boolean {
  const token = loadToken()
  if (!token) return false
  return cached?.token === token && cached.allowed
}

export async function refreshDevToolsAccess(): Promise<void> {
  const token = loadToken()
  if (!token) {
    cached = null
    return
  }

  try {
    const response = await apiFetch('https://api.jailbreakchangelogs.com/v2/users/me', {
      headers: { Authorization: token }
    })
    const data = (await response.json()) as { flags?: UserFlag[] }
    const allowed = (data.flags ?? []).some((f) => PRIVILEGED_FLAGS.includes(f.flag) && f.enabled)
    cached = { token, allowed }
  } catch (error) {
    console.warn('[devtools-access] failed to check user flags:', (error as Error).message)
    cached = { token, allowed: false }
  }
}
