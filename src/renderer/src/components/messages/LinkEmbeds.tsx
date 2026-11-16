import { lazy, Suspense, useEffect, useState } from 'react'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useOpenSiteLink } from '@renderer/components/ui/linkified-text'
import { fetchLinkEmbed, type EmbedComponent, type LinkEmbed } from '@renderer/lib/messagesApi'
import { siteLinksIn } from '@renderer/lib/siteLinks'
import { ImageViewer } from '@renderer/components/messages/MessageImages'

const Markdown = lazy(() => import('@renderer/components/ui/markdown').then((m) => ({ default: m.Markdown })))

const MAX_EMBEDS = 3

const CARD = 'max-w-[432px] rounded-[4px] border-l-4 border-border-card bg-secondary-bg p-3'

const TEXT_DISPLAY =
  'text-sm text-message-text [&_p]:my-0 [&_p]:text-message-text [&_h1]:mt-0 [&_h1]:mb-1 [&_h1]:border-0 [&_h1]:pb-0 [&_h1]:text-xl [&_h2]:mt-0 [&_h2]:mb-1 [&_h2]:border-0 [&_h2]:pb-0 [&_h2]:text-lg [&_h3]:mt-0 [&_h3]:mb-1 [&_h3]:text-base'

export function ExternalLinkIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  )
}

export function LinkEmbeds({ text }: { text: string }): React.JSX.Element | null {
  const { token } = useAuth()
  const links = siteLinksIn(text).slice(0, MAX_EMBEDS)
  const key = links.join(' ')
  const [embeds, setEmbeds] = useState<LinkEmbed[]>([])

  useEffect(() => {
    if (!token || !key) return setEmbeds([])
    let cancelled = false
    void Promise.all(key.split(' ').map((url) => fetchLinkEmbed(token, url))).then((results) => {
      if (!cancelled)
        setEmbeds(
          results.filter(
            (e): e is LinkEmbed => e !== null && Boolean(e.component?.type === 17 || e.title || e.description)
          )
        )
    })
    return () => {
      cancelled = true
    }
  }, [token, key])

  if (embeds.length === 0) return null
  return (
    <div className="mt-1 flex flex-col gap-1">
      {embeds.map((embed) =>
        embed.component?.type === 17 ? (
          <ComponentCard key={embed.url} container={embed.component} fallbackColor={embed.theme_color} />
        ) : (
          <EmbedCard key={embed.url} embed={embed} />
        )
      )}
    </div>
  )
}

function ExpandableImage({ src, alt, className }: { src: string; alt: string; className: string }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-zoom-in">
        <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" className={className} />
      </button>
      <ImageViewer src={open ? src : null} onClose={() => setOpen(false)} canSave={false} />
    </>
  )
}

function httpsUrl(url: string | undefined): string | null {
  return url?.startsWith('https://') ? url : null
}

function ComponentCard({
  container,
  fallbackColor
}: {
  container: EmbedComponent
  fallbackColor: string | null
}): React.JSX.Element {
  const accent =
    typeof container.accent_color === 'number'
      ? `#${container.accent_color.toString(16).padStart(6, '0')}`
      : fallbackColor
  return (
    <div className={`${CARD} flex max-w-[560px]! flex-col gap-2`} style={accent ? { borderLeftColor: accent } : undefined}>
      {container.components?.map((child, i) => <Component key={i} node={child} />)}
    </div>
  )
}

function Component({ node }: { node: EmbedComponent }): React.JSX.Element | null {
  switch (node.type) {
    case 10:
      return node.content ? (
        <Suspense fallback={<p className="text-sm whitespace-pre-line text-message-text">{node.content}</p>}>
          <Markdown className={TEXT_DISPLAY}>{node.content}</Markdown>
        </Suspense>
      ) : null
    case 9:
      return (
        <div className="flex gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {node.components?.map((child, i) => <Component key={i} node={child} />)}
          </div>
          {node.accessory && (
            <div className="shrink-0 self-start">
              <Component node={node.accessory} />
            </div>
          )}
        </div>
      )
    case 11: {
      const src = httpsUrl(node.media?.url)
      return src ? (
        <ExpandableImage src={src} alt={node.description ?? ''} className="h-[85px] w-[85px] rounded-lg object-cover" />
      ) : null
    }
    case 12: {
      const items = (node.items ?? []).filter((item) => httpsUrl(item.media?.url))
      if (items.length === 0) return null
      return (
        <div className={`grid gap-1 ${items.length > 1 ? 'grid-cols-2' : ''}`}>
          {items.slice(0, 10).map((item, i) => (
            <ExpandableImage
              key={i}
              src={item.media!.url!}
              alt={item.description ?? ''}
              className={`w-full rounded-lg object-cover ${items.length > 1 ? 'aspect-square' : 'max-h-[300px]'} ${item.spoiler ? 'blur-xl' : ''}`}
            />
          ))}
        </div>
      )
    }
    case 14:
      return node.divider === false ? (
        <div className={node.spacing === 2 ? 'h-4' : 'h-1'} />
      ) : (
        <hr className={`border-border-primary ${node.spacing === 2 ? 'my-2' : 'my-0.5'}`} />
      )
    case 1:
      return (
        <div className="flex flex-wrap gap-1.5">
          {node.components?.map((child, i) => <Component key={i} node={child} />)}
        </div>
      )
    case 2:
      return <LinkButton button={node} />
    default:
      return null
  }
}

function LinkButton({ button }: { button: EmbedComponent }): React.JSX.Element | null {
  const openLink = useOpenSiteLink()
  const url = button.url && /^https?:\/\//i.test(button.url) ? button.url : null
  if (button.style !== 5 || !url || (!button.label && !button.emoji)) return null
  const emoji = button.emoji?.id ? (
    <img
      src={`https://cdn.discordapp.com/emojis/${button.emoji.id}.${button.emoji.animated ? 'gif' : 'webp'}?size=44`}
      alt={button.emoji.name ?? ''}
      className="h-[18px] w-[18px]"
    />
  ) : (
    button.emoji?.name
  )
  return (
    <a
      href={url}
      aria-disabled={button.disabled || undefined}
      onClick={(e) => {
        e.preventDefault()
        if (!button.disabled) openLink(url)
      }}
      className={`flex h-7 items-center gap-1 rounded-md bg-button-secondary px-2.5 text-[13px] font-medium whitespace-nowrap text-primary-text transition-colors hover:bg-button-secondary-hover ${button.disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      {emoji}
      {button.label}
      <ExternalLinkIcon className="h-3 w-3 text-secondary-text" />
    </a>
  )
}

function EmbedCard({ embed }: { embed: LinkEmbed }): React.JSX.Element {
  const openLink = useOpenSiteLink()
  const image = httpsUrl(embed.image ?? undefined)
  return (
    <div className={`${CARD} grid gap-2`} style={embed.theme_color ? { borderLeftColor: embed.theme_color } : undefined}>
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
        <ExpandableImage src={image} alt="" className="max-h-[300px] w-full rounded-[4px] object-cover" />
      )}
    </div>
  )
}
