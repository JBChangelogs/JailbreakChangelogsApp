import { TAB_TYPES, type TabType } from '@renderer/contexts/TabsContext'

const SITE_LINK_PATTERN =
  /(?<![\w.@/-])(?:https?:\/\/)?(?:[a-z0-9-]+\.)*jailbreakchangelogs\.com(?:[/?#]\S*)?(?!\.?[\w@:-])/gi

export type TextPart = string | { text: string; href: string }

export function splitSiteLinks(text: string): TextPart[] {
  const parts: TextPart[] = []
  let last = 0
  for (const match of text.matchAll(SITE_LINK_PATTERN)) {
    const link = match[0].replace(/\.+$/, '')
    const start = match.index
    if (start > last) parts.push(text.slice(last, start))
    parts.push({ text: link, href: /^https?:\/\//i.test(link) ? link : `https://${link}` })
    last = start + link.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function siteLinksIn(text: string): string[] {
  return [...new Set(splitSiteLinks(text).flatMap((part) => (typeof part === 'string' ? [] : [part.href])))]
}

export function appTabFor(href: string): TabType | null {
  try {
    const url = new URL(href)
    if (url.hostname !== 'app.jailbreakchangelogs.com') return null
    const segment = url.pathname.split('/')[1]?.toLowerCase() as TabType
    return TAB_TYPES.includes(segment) ? segment : 'home'
  } catch {
    return null
  }
}

function check(): void {
  const links = (text: string): string[] => splitSiteLinks(text).flatMap((p) => (typeof p === 'string' ? [] : [p.href]))
  const eq = (text: string, expected: string[]): void => {
    const got = links(text)
    if (JSON.stringify(got) !== JSON.stringify(expected)) throw new Error(`${text}: ${JSON.stringify(got)}`)
  }
  eq('https://app.jailbreakchangelogs.com/', ['https://app.jailbreakchangelogs.com/'])
  eq('see https://jailbreakchangelogs.com/values?x=1', ['https://jailbreakchangelogs.com/values?x=1'])
  eq('www.jailbreakchangelogs.com/trading', ['https://www.jailbreakchangelogs.com/trading'])
  eq('go to jailbreakchangelogs.com.', ['https://jailbreakchangelogs.com'])
  eq('JailbreakChangelogs.com/values.', ['https://JailbreakChangelogs.com/values'])
  eq('jailbreakchangelogs.com.evil.com', [])
  eq('evil.com/jailbreakchangelogs.com', [])
  eq('jailbreakchangelogs.com@evil.com', [])
  eq('eviljailbreakchangelogs.com', [])
  eq('https://evil.com', [])
  const text = 'a jailbreakchangelogs.com. b'
  if (splitSiteLinks(text).map((p) => (typeof p === 'string' ? p : p.text)).join('') !== text) throw new Error('lossy split')
  if (appTabFor('https://app.jailbreakchangelogs.com/trades') !== 'trades') throw new Error('app tab')
  if (appTabFor('https://app.jailbreakchangelogs.com/') !== 'home') throw new Error('app home')
  if (appTabFor('https://jailbreakchangelogs.com/trades') !== null) throw new Error('site link')
}

if (import.meta.env?.DEV) check()
