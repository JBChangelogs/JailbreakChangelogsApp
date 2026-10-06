const INTERNAL_HOSTNAMES = new Set([
  'jailbreakchangelogs.com',
  'www.jailbreakchangelogs.com',
  'jailbreakchangelogs.xyz',
  'www.jailbreakchangelogs.xyz'
])

function isJailbreakChangelogsHostname(hostname: string): boolean {
  return (
    hostname === 'jailbreakchangelogs.com' ||
    hostname.endsWith('.jailbreakchangelogs.com') ||
    hostname === 'jailbreakchangelogs.xyz' ||
    hostname.endsWith('.jailbreakchangelogs.xyz')
  )
}

export function isWhitelistedNotificationLink(link: string): boolean {
  try {
    const url = new URL(link)
    if (url.protocol !== 'https:') return false
    return INTERNAL_HOSTNAMES.has(url.hostname) || isJailbreakChangelogsHostname(url.hostname)
  } catch {
    return false
  }
}
