import type { ReactNode } from 'react'
import { useTabActions } from '@renderer/contexts/TabsContext'
import { appTabFor, splitSiteLinks } from '@renderer/lib/siteLinks'

export function useOpenSiteLink(): (href: string) => void {
  const { open } = useTabActions()
  return (href) => {
    const tab = appTabFor(href)
    if (tab) open(tab)
    else void window.api.openExternal(href)
  }
}

export function LinkifiedText({
  text,
  renderText = (part) => part
}: {
  text: string
  renderText?: (text: string, key: number) => ReactNode
}): React.JSX.Element {
  const openLink = useOpenSiteLink()
  return (
    <>
      {splitSiteLinks(text).map((part, i) =>
        typeof part === 'string' ? (
          renderText(part, i)
        ) : (
          <a
            key={i}
            href={part.href}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              openLink(part.href)
            }}
            className="text-link hover:text-link-hover hover:underline"
          >
            {part.text}
          </a>
        )
      )}
    </>
  )
}
