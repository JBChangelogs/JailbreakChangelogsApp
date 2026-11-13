const API_BASE = 'https://api.jailbreakchangelogs.com'

type Matched = 'title' | 'description' | 'body' | 'id' | 'keyword' | 'filter'
interface ChangelogLink {
  id: number
}

export type OmniResult =
  | {
      kind: 'item'
      id: number
      name: string
      type: string
      cash_value: string | null
      season?: number | null
      changelogs?: ChangelogLink[]
      changelog_ids?: number[]
    }
  | { kind: 'user'; id: string; username: string; global_name?: string | null; avatar?: string | null }
  | {
      kind: 'season'
      season: number
      title: string
      description: string
      changelogs?: ChangelogLink[]
      changelog_ids?: number[]
      launch_changelog_id?: number | null
    }
  | { kind: 'reward'; id: number; item: string; requirement: string; season: number; season_title: string }
  | {
      kind: 'changelog'
      id: number
      title: string
      image_url: string | null
      snippet?: string
      season?: number | null
      season_title?: string | null
      launches_season?: number | null
      matched?: Matched
    }
  | { kind: 'setting'; name: string; description: string; category: string }
  | { kind: 'server'; id: number; link: string; rules: string; owner: { id: string; username: string; global_name?: string | null } }
  | { kind: 'theme'; label: string; icon: string | null; scheme: 'light' | 'dark'; custom: boolean; slug?: string; share_code?: string }

export interface OmniGroup {
  group: string
  results: OmniResult[]
  has_more: boolean
}

export const OMNI_GROUP_LABELS: Record<string, string> = {
  items: 'Items',
  users: 'Users',
  seasons: 'Seasons',
  rewards: 'Rewards',
  changelogs: 'Changelogs',
  settings: 'Settings',
  servers: 'Servers',
  themes: 'Themes'
}

export const latestChangelog = (result: { changelogs?: ChangelogLink[]; changelog_ids?: number[] }): number | undefined =>
  result.changelogs?.[0]?.id ?? result.changelog_ids?.[0]

export async function fetchOmniSearch(
  token: string,
  query: string,
  limit: number,
  signal?: AbortSignal,
  { group, page }: { group?: string; page?: number } = {}
): Promise<OmniGroup[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  if (group) params.set('group', group)
  if (page) params.set('page', String(page))
  const res = await fetch(`${API_BASE}/v2/search?${params}`, { headers: { Authorization: token }, signal })
  if (res.status === 429) throw new Error("You're searching too fast. Wait a moment and try again.")
  if (!res.ok) throw new Error(`Search failed (${res.status})`)
  const data = (await res.json()) as { groups?: OmniGroup[] }
  return Array.isArray(data?.groups) ? data.groups.filter((g) => Array.isArray(g.results) && g.results.length) : []
}
