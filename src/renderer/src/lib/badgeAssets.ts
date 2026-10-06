export const BADGE_BASE_URL = 'https://assets.jailbreakchangelogs.com/assets/website_icons'

export function supporterBadgeUrl(level: number): string {
  return `${BADGE_BASE_URL}/jbcl_supporter_${level}.svg`
}

export function earlyAdopterBadgeUrl(): string {
  return `${BADGE_BASE_URL}/jbcl_early_adopter.svg`
}

export function flagBadgeUrl(flag: string): string {
  if (flag === 'is_badimo') return `${BADGE_BASE_URL}/Jailbreak.png`
  const name = flag.startsWith('is_') ? flag.slice(3) : flag
  return `${BADGE_BASE_URL}/jbcl_${name}.svg`
}

export function guildBadgeUrl(guildId: string, badgeHash: string): string {
  return `https://cdn.discordapp.com/guild-tag-badges/${guildId}/${badgeHash}`
}
