import { useOwnRobloxActivity } from '@renderer/hooks/useOwnRobloxActivity'
import { KNOWN_ROBLOX_GAMES } from '@shared/robloxGames'
import jailbreakLogo from '@renderer/assets/jailbreak-logo.webp'

const GAME_ICONS: Record<string, string> = {
  Jailbreak: jailbreakLogo
}

export function RobloxStatusBar(): React.JSX.Element | null {
  const { placeId } = useOwnRobloxActivity()
  if (!placeId) return null
  const gameName = KNOWN_ROBLOX_GAMES[placeId] ?? 'Roblox'
  const icon = GAME_ICONS[gameName]

  return (
    <div className="flex shrink-0 items-center gap-2 rounded-t-md  border-t border-border-card bg-secondary-bg px-3.5 py-2 text-xs font-medium text-white">
      {icon ? (
        <img src={icon} alt="" className="h-8 w-8 shrink-0 rounded-sm object-contain" draggable={false} />
      ) : (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-success-vibrant" />
      )}
      <span className="truncate">Playing {gameName}</span>
    </div>
  )
}
