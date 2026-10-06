import type { RobberyPlayer } from './robbery'

export interface BountyData {
  bounty: number
  display_name: string
  userid: number
  inventory: string[]
  server?: {
    job_id: string
    server_time: number
    timestamp: number
    bot_id: number
    players: RobberyPlayer[]
  }
  server_time: number
  timestamp: number
}
