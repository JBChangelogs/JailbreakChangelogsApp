import appIcon from '@renderer/assets/icon.png'
import controllerIcon from '@renderer/assets/discord-controller-icon.png'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import type { RichPresencePreferenceKey } from '@renderer/contexts/PreferencesContext'

interface RichPresencePreviewProps {
  richPresence: Record<RichPresencePreferenceKey, boolean>
  hideRobloxActivity: boolean
}

export function RichPresencePreview({ richPresence, hideRobloxActivity }: RichPresencePreviewProps): React.JSX.Element {
  if (!richPresence.rich_presence_enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-border-primary px-4 py-6 text-center text-xs text-quaternary-text">
        Rich Presence is off - Discord won't show any activity for this app.
      </div>
    )
  }

  const showBadge = richPresence.rich_presence_show_roblox_badge && !hideRobloxActivity
  const showDetails = richPresence.rich_presence_show_details
  const showState = richPresence.rich_presence_show_state
  const showJoin = richPresence.rich_presence_show_join_button
  const showWebsite = richPresence.rich_presence_show_website_button

  return (
    <div className="rounded-lg bg-[#232428] p-3">
      <div className="flex gap-3">
        <div className="relative shrink-0">
          <img src={appIcon} alt="" className="h-16 w-16 rounded-lg object-cover" />
          {showBadge && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute -right-1 -bottom-1 h-7 w-7 overflow-hidden rounded-full bg-[#232428] ring-[3px] ring-[#232428]">
                  <img src={controllerIcon} alt="" className="h-full w-full object-cover" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Inside Jailbreak</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <p className="truncate text-sm font-semibold text-white">Jailbreak Changelogs</p>
          {showDetails && <p className="mt-0.5 truncate text-xs text-white/70">Checking the value list</p>}
          {showState && <p className="mt-0.5 truncate text-xs text-white/70">Values (App)</p>}
        </div>
      </div>
      {(showJoin || showWebsite) && (
        <div className="mt-3 flex gap-2">
          {showJoin && (
            <div className="flex-1 rounded-md bg-white/10 py-1.5 text-center text-xs font-semibold text-white">
              Join Server
            </div>
          )}
          {showWebsite && (
            <div className="flex-1 rounded-md bg-white/10 py-1.5 text-center text-xs font-semibold text-white">
              Visit Website
            </div>
          )}
        </div>
      )}
    </div>
  )
}
