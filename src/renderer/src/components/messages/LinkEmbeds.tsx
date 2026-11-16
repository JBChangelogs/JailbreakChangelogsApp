import { useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useOpenSiteLink } from '@renderer/components/ui/linkified-text'
import { fetchLinkEmbed, type LinkEmbed } from '@renderer/lib/messagesApi'
import { siteLinksIn } from '@renderer/lib/siteLinks'

const MAX_EMBEDS = 3

export function LinkEmbeds({ text }: { text: string }): React.JSX.Element | null {
  const { token } = useAuth()
  const links = siteLinksIn(text).slice(0, MAX_EMBEDS)
  const key = links.join(' ')
  const [embeds, setEmbeds] = useState<LinkEmbed[]>([])

  useEffect(() => {
    if (!token || !key) return setEmbeds([])
    let cancelled = false
    void Promise.all(key.split(' ').map((url) => fetchLinkEmbed(token, url))).then((results) => {
      if (!cancelled) setEmbeds(results.filter((e): e is LinkEmbed => e !== null && Boolean(e.title || e.description)))
    })
    return () => {
      cancelled = true
    }
  }, [token, key])

  if (embeds.length === 0) return null
  return (
    <div className="mt-1 flex flex-col gap-1">
      {embeds.map((embed) => (
        <EmbedCard key={embed.url} embed={embed} />
      ))}
    </div>
  )
}

function EmbedCard({ embed }: { embed: LinkEmbed }): React.JSX.Element {
  const openLink = useOpenSiteLink()
  const image = embed.image?.startsWith('https://') ? embed.image : null
  return (
    <div
      className="grid max-w-[432px] gap-2 rounded-[4px] border-l-4 border-border-card bg-secondary-bg p-3"
      style={embed.theme_color ? { borderLeftColor: embed.theme_color } : undefined}
    >
      {embed.site_name && <p className="text-xs text-secondary-text">{embed.site_name}</p>}
      {embed.title && (
        <a
          href={embed.url}
          onClick={(e) => {
            e.preventDefault()
            openLink(embed.url)
          }}
          className="text-base font-semibold break-words text-link hover:underline"
        >
          {embed.title}
        </a>
      )}
      {embed.description && (
        <p className="line-clamp-4 text-sm break-words whitespace-pre-line text-message-text">{embed.description}</p>
      )}
      {image && (
        <img src={image} alt="" loading="lazy" className="max-h-[300px] w-full rounded-[4px] object-cover" />
      )}
    </div>
  )
}
