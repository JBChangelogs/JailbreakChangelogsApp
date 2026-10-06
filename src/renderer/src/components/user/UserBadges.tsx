import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { showToast } from '@renderer/lib/toast'
import { flagBadgeUrl, guildBadgeUrl, supporterBadgeUrl, earlyAdopterBadgeUrl } from '@renderer/lib/badgeAssets'
import type { UserFlag, UserPrimaryGuild } from '@shared/user'

const BADGE_PX = { sm: 16, md: 20 } as const

interface BadgeButtonProps {
  src: string
  alt: string
  tooltip: string
  size: number
  onClick: () => void
  onFailed: () => void
}

function BadgeButton({ src, alt, tooltip, size, onClick, onFailed }: BadgeButtonProps): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          className="shrink-0"
        >
          <img
            src={src}
            alt={alt}
            width={size}
            height={size}
            className="object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              onFailed()
            }}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  )
}

interface UserBadgesProps {
  usernumber?: number
  premiumType?: number
  flags?: UserFlag[]
  primaryGuild?: UserPrimaryGuild | null
  size?: 'sm' | 'md'
}

export function UserBadges({
  usernumber,
  premiumType,
  flags = [],
  primaryGuild,
  size = 'md'
}: UserBadgesProps): React.JSX.Element | null {
  const [failedCount, setFailedCount] = useState(0)
  const badgeSize = BADGE_PX[size]

  const sortedFlags = flags
    .filter((f) => f.enabled !== false && f.flag)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))

  const badges: React.ReactNode[] = sortedFlags.map((flag) => (
    <BadgeButton
      key={flag.flag}
      src={flagBadgeUrl(flag.flag)}
      alt={flag.flag}
      tooltip={flag.description || flag.flag}
      size={badgeSize}
      onClick={() => showToast(flag.description || flag.flag)}
      onFailed={() => setFailedCount((c) => c + 1)}
    />
  ))

  if (premiumType && premiumType >= 1 && premiumType <= 3) {
    badges.push(
      <BadgeButton
        key="premium"
        src={supporterBadgeUrl(premiumType)}
        alt={`Supporter Type ${premiumType}`}
        tooltip={`Supporter Type ${premiumType}`}
        size={badgeSize}
        onClick={() => showToast(`This user has Supporter Type ${premiumType}!`)}
        onFailed={() => setFailedCount((c) => c + 1)}
      />
    )
  }

  if (usernumber != null && usernumber <= 100 && !sortedFlags.some((f) => f.flag === 'is_early_adopter')) {
    badges.push(
      <BadgeButton
        key="early"
        src={earlyAdopterBadgeUrl()}
        alt="Early Adopter"
        tooltip="Early Adopter"
        size={badgeSize}
        onClick={() =>
          showToast('Early Adopter', {
            description: 'Awarded to the first 100 people to sign up to Jailbreak Changelogs!'
          })
        }
        onFailed={() => setFailedCount((c) => c + 1)}
      />
    )
  }

  let guildBadge: React.ReactNode = null
  if (primaryGuild?.tag && primaryGuild.badge && primaryGuild.identity_guild_id) {
    const guild = primaryGuild as { tag: string; badge: string; identity_guild_id: string }
    guildBadge = (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-card bg-tertiary-bg px-2.5 py-1 transition-colors hover:bg-quaternary-bg/60"
          >
            <img
              src={guildBadgeUrl(guild.identity_guild_id, guild.badge)}
              alt={guild.tag ?? ''}
              width={badgeSize}
              height={badgeSize}
              className="shrink-0"
            />
            <span className="text-sm leading-none font-semibold text-primary-text">{guild.tag}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Guild: {guild.tag}</TooltipContent>
      </Tooltip>
    )
  }

  const visibleCount = badges.length - failedCount
  if (visibleCount <= 0 && !guildBadge) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleCount > 0 && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-border-card bg-tertiary-bg px-2.5 py-1">
          {badges}
        </div>
      )}
      {guildBadge}
    </div>
  )
}
