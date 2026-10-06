import { useUserProfiles } from '@renderer/hooks/useUserProfiles'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { RobloxAvatar } from '@renderer/components/dupefinder/RobloxAvatar'
import type { JoinRosterEntry } from '@renderer/hooks/useTrackerWebSocket'

export function ServerRoster({
  roster,
  className
}: {
  roster: JoinRosterEntry[]
  className?: string
}): React.JSX.Element | null {
  const profiles = useUserProfiles(roster.map((user) => user.userId))

  if (roster.length === 0) return null

  return (
    <div className={`flex w-fit cursor-default items-center gap-2 text-xs text-secondary-text ${className ?? ''}`}>
      <div className="flex items-center">
        {roster.map((user, index) => (
          <Tooltip key={user.userId}>
            <TooltipTrigger asChild>
              <span
                className="relative rounded-full ring-2 ring-secondary-bg"
                style={{ zIndex: roster.length - index, marginLeft: index === 0 ? 0 : -8 }}
              >
                <RobloxAvatar
                  userId={profiles.get(user.userId)?.roblox_id || user.userId}
                  label={profiles.get(user.userId)?.roblox_username || user.userId}
                  className="h-7 w-7"
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {profiles.get(user.userId)?.roblox_username || user.userId}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <span className="font-medium tabular-nums text-primary-text">
        {roster.length} {roster.length === 1 ? 'person' : 'people'} joined
      </span>
    </div>
  )
}
