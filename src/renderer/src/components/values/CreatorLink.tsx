export function CreatorLink({ creator }: { creator: string | null }): React.JSX.Element {
  if (!creator) return <span>Unknown</span>
  if (creator === 'N/A') return <span>???</span>

  const match = creator.match(/(.*?)\s*\((\d+)\)/)
  if (!match) {
    if (creator === 'Badimo') {
      return (
        <a
          href="https://www.roblox.com/communities/3059674/Badimo#!/about"
          target="_blank"
          rel="noopener noreferrer"
          className="text-link transition-colors hover:text-link-hover hover:underline"
        >
          {creator}
        </a>
      )
    }
    return <span>{creator}</span>
  }

  const [, name, id] = match
  return (
    <a
      href={`https://www.roblox.com/users/${id}/profile`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-link transition-colors hover:text-link-hover hover:underline"
    >
      {name}
    </a>
  )
}
