// How the website draws a user: Supporter III gets a squircle avatar, and the banner is their
// custom one, their Discord one, or a background picked from their ID. Kept in step with the
// site's src/utils/ui/avatar.tsx and src/components/Profile/Banner.tsx.

import { accentColorToHex, toAccentStyle, type Accent } from '@renderer/lib/accentColor'
import type { UserProfile } from '@shared/user'

const BACKGROUNDS_BASE_URL = 'https://assets.jailbreakchangelogs.com/assets/backgrounds/v2'
const TOTAL_BACKGROUND_IMAGES = 36

export const isSquircle = (profile?: UserProfile): boolean => profile?.premiumtype === 3

/** The avatar's corners; `ring` for the cut-out ring drawn behind it. */
export function avatarShapeClass(profile?: UserProfile, ring = false): string {
  if (!isSquircle(profile)) return 'rounded-full'
  return ring ? 'rounded-[28%]' : 'rounded-[25%]'
}

function settingsOf(profile: UserProfile): Record<string, unknown> {
  return (profile.settings_v2 ?? profile.settings ?? {}) as Record<string, unknown>
}

export function isProfilePrivate(profile: UserProfile, viewerId: string | undefined): boolean {
  return settingsOf(profile).profile_public === false && viewerId !== profile.id
}

export const hidesPresence = (profile: UserProfile): boolean => settingsOf(profile).hide_presence === true

// Must match the site's 32-bit overflow exactly, or it picks a different image.
function bannerSeed(userId: string): number {
  let seed = 0
  for (let i = 0; i < userId.length; i++) {
    seed = (seed << 5) - seed + userId.charCodeAt(i)
    seed = seed & seed
  }
  return Math.abs(seed)
}

export function fallbackBanner(userId: string): string {
  return `${BACKGROUNDS_BASE_URL}/background${(bannerSeed(userId) % TOTAL_BACKGROUND_IMAGES) + 1}.webp`
}

/** `primary` is null when the user has no banner (or it's hidden); `fallback` is used then, or if it fails. */
export function profileBanner(
  userId: string,
  profile: UserProfile,
  isPrivate: boolean
): { primary: string | null; fallback: string } {
  const fallback = fallbackBanner(userId)
  if (isPrivate) return { primary: null, fallback }
  const custom = profile.custom_banner
  if (settingsOf(profile).custom_banner === true && (profile.premiumtype ?? 0) >= 2 && custom && custom !== 'N/A') {
    return { primary: custom, fallback }
  }
  const banner = profile.banner
  if (banner && banner !== 'None') {
    // /users/me gives a full URL; other endpoints give the hash.
    return {
      primary: /^https?:\/\//i.test(banner) ? banner : `https://cdn.discordapp.com/banners/${userId}/${banner}?size=600`,
      fallback
    }
  }
  return { primary: null, fallback }
}

const settingOn = (profile: UserProfile, key: string): boolean => {
  const value = settingsOf(profile)[key]
  return value === true || value === 1
}

export function profileAccent(profile: UserProfile): Accent | null {
  if (!settingOn(profile, 'colored_profile_cards')) return null
  const color = accentColorToHex(profile.custom_accent_color) ?? accentColorToHex(profile.accent_color)
  if (!color) return null
  return { color, gradient: accentColorToHex(profile.accent_gradient), style: toAccentStyle(profile.accent_style) }
}

export function profileBackground(profile: UserProfile): string | null {
  return settingOn(profile, 'custom_background') && profile.custom_background ? profile.custom_background : null
}
