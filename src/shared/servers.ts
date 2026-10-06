import type { UserProfile } from './user'

export interface VipServer {
  id: number
  link: string
  rules: string
  expires: string
  created_at: number
}

export interface VipServerWithOwner extends VipServer {
  user: UserProfile
}
