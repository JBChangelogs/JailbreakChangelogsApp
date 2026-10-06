export interface UserFlag {
  flag: string
  created_at: number
  enabled: boolean
  index: number
  description: string
}

export interface UserPresence {
  status: string
  last_updated: number
}

export interface UserRobloxInfo {
  roblox_id: string
  roblox_username: string
  roblox_display_name: string
  roblox_avatar: string
  roblox_join_date: number
}

export interface UserPrimaryGuild {
  tag: string | null
  badge: string | null
  identity_enabled: boolean
  identity_guild_id: string | null
}

export interface UserProfile {
  id: string
  username: string
  name: string
  roblox_id?: string | null
  roblox_username?: string | null
  avatar: string | null
  banner: string | null
  supporter: number
  banned: unknown
  flags: UserFlag[]
  presence?: UserPresence | null
  roblox: UserRobloxInfo | null
  settings?: Record<string, unknown>
  permissions?: Record<string, unknown>
  usernumber?: number
  created_at?: string
  global_name?: string
  premiumtype?: number
  primary_guild?: UserPrimaryGuild | null
}
