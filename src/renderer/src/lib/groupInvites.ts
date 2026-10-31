const INVITE_CODE = /^[A-Za-z0-9]{4,32}$/

export function groupInviteUrl(code: string): string {
  return `https://jailbreakchangelogs.com/messages?invite=${encodeURIComponent(code)}&app=true`
}

export function parseGroupInviteCode(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'jailbreakchangelogs:' || parsed.hostname !== 'invite') return null
    const code = parsed.searchParams.get('code') ?? parsed.pathname.replace(/^\/+|\/+$/g, '')
    return INVITE_CODE.test(code) ? code : null
  } catch {
    return null
  }
}
