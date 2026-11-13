export const HYPERCHROME_CHANCE_DENOMINATORS = [179, 378, 608, 696, 1068] as const
const PITY_MULTIPLIER = 1.25
const SMALL_SERVER_ODDS_MULTIPLIER = 0.66

export const HYPERCHROME_PITY_BIG = HYPERCHROME_CHANCE_DENOMINATORS.map((d) => Math.ceil(d * PITY_MULTIPLIER))
export const HYPERCHROME_PITY_SMALL = HYPERCHROME_CHANCE_DENOMINATORS.map((d) =>
  Math.ceil((d / SMALL_SERVER_ODDS_MULTIPLIER) * PITY_MULTIPLIER)
)

export type HyperchromeLevel = 0 | 1 | 2 | 3 | 4

const pityBase = (level: HyperchromeLevel, small: boolean): number =>
  (small ? HYPERCHROME_PITY_SMALL : HYPERCHROME_PITY_BIG)[level]

const clampPercent = (pct: number): number => Math.min(Math.max(pct, 0), 100)

export function robberiesDone(level: HyperchromeLevel, pct: number, small: boolean): number {
  return (clampPercent(pct) / 100) * pityBase(level, small)
}

export function robberiesToLevelUp(level: HyperchromeLevel, pct: number, small: boolean): number {
  return Math.ceil((pityBase(level, small) * (100 - clampPercent(pct))) / 100)
}

export function robberiesToBigPityGoal(level: HyperchromeLevel, pct: number, small: boolean): number {
  return Math.max(0, Math.ceil(HYPERCHROME_PITY_BIG[level] - robberiesDone(level, pct, small)))
}

export function bigPityAtLevel(level: HyperchromeLevel, pct: number, small: boolean, other: HyperchromeLevel): number {
  return (robberiesDone(level, pct, small) / HYPERCHROME_PITY_BIG[other]) * 100
}

export function equivalentPity(level: HyperchromeLevel, pct: number, small: boolean): number {
  return (robberiesDone(level, pct, small) / pityBase(level, !small)) * 100
}
