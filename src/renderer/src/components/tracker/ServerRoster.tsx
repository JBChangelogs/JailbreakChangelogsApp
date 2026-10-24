import { useUserProfiles } from '@renderer/hooks/useUserProfiles'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { RobloxAvatar } from '@renderer/components/dupefinder/RobloxAvatar'
import { UserAvatar } from '@renderer/components/messages/UserAvatar'
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
        {roster.map((user, index) => {
          const profile = profiles.get(user.userId)
          const robloxId = profile?.roblox_id ? String(profile.roblox_id) : null
          const name = profile?.roblox_username || profile?.username || 'Unknown user'
          return (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <span
                  className="relative rounded-full ring-2 ring-secondary-bg"
                  style={{ zIndex: roster.length - index, marginLeft: index === 0 ? 0 : -8 }}
                >
                  {robloxId ? (
                    <RobloxAvatar userId={robloxId} label={name} className="h-7 w-7" />
                  ) : (
                    <UserAvatar id={name} profile={profile} className="h-7 w-7 rounded-full" />
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent>{name}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      <span className="font-medium tabular-nums text-primary-text">
        {roster.length} {roster.length === 1 ? 'person' : 'people'} joined
      </span>
    </div>
  )
}
