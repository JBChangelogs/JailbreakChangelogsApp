import type { RecentChange } from '@shared/item'

export const demandOrder = [
  'Close To None',
  'Very Low',
  'Low',
  'Below Average',
  'Average',
  'Decent',
  'High',
  'Very High'
] as const

export const trendOrder = [
  'Dropping',
  'Unstable',
  'Hoarded',
  'Manipulated',
  'Stable',
  'Recovering',
  'Rising',
  'Hyped'
] as const

export function parseCashValue(value: string | null): number {
  if (value === null || value === 'N/A' || value === 'null') return -1
  const numericPart = value.replace(/[^0-9.]/g, '')
  if (numericPart === '') return -1
  const num = parseFloat(numericPart)
  if (isNaN(num)) return -1
  const lower = value.toLowerCase()
  if (lower.includes('k')) return num * 1000
  if (lower.includes('m')) return num * 1000000
  if (lower.includes('b')) return num * 1000000000
  return num
}

export function formatFullValue(value: string | null): string {
  if (value === null || value === 'N/A' || value === 'null') return 'N/A'
  const numeric = parseCashValue(value)
  if (numeric === -1) return value
  return numeric.toLocaleString()
}

function formatSinglePrice(price: string): string {
  if (price === 'N/A' || price === 'Free' || price === 'null') return price === 'null' ? 'N/A' : price
  const numericPart = price.toLowerCase().replace(/[kmb]$/, '')
  const suffix = price.toLowerCase().slice(-1)
  const numericValue = parseFloat(numericPart)
  if (isNaN(numericValue)) return price
  let fullNumber: number
  switch (suffix) {
    case 'k':
      fullNumber = numericValue * 1000
      break
    case 'm':
      fullNumber = numericValue * 1000000
      break
    case 'b':
      fullNumber = numericValue * 1000000000
      break
    default:
      fullNumber = numericValue
  }
  return fullNumber.toLocaleString()
}

function formatPricePart(part: string): string {
  const trimmed = part.trim()
  const match = trimmed.match(/^([\d.,]+[kmb]?)(\s.*)?$/i)
  if (!match) return formatSinglePrice(trimmed)
  const [, numeric, rest = ''] = match
  return `${formatSinglePrice(numeric)}${rest}`
}

export function formatPrice(price: string | null): string {
  if (price === null || price === 'N/A') return 'N/A'
  if (price.includes(' / ')) return price.split(' / ').map(formatPricePart).join(' / ')
  if (price.includes(' - ')) {
    const [minPrice, maxPrice] = price.split(' - ')
    return `${formatSinglePrice(minPrice)} - ${formatSinglePrice(maxPrice)}`
  }
  return formatSinglePrice(price)
}

// Some items have null demand/trend in the API (e.g. Time Attack), so accept missing values.
function normalizeCase(value: string | null | undefined): string {
  return (value ?? '')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function sortByCashValue(a: string, b: string, order: 'asc' | 'desc'): number {
  const aValue = a === 'N/A' ? (order === 'desc' ? -1 : Infinity) : parseCashValue(a)
  const bValue = b === 'N/A' ? (order === 'desc' ? -1 : Infinity) : parseCashValue(b)
  return order === 'desc' ? bValue - aValue : aValue - bValue
}

export function getValueChange(
  recentChanges: RecentChange[] | null | undefined,
  valueType: 'cash_value' | 'duped_value'
): { oldValue: string; difference: number } | null {
  if (!recentChanges || recentChanges.length === 0) return null
  const change = recentChanges.find((c) => c.field === valueType)
  if (!change) return null

  const oldNumeric = parseCashValue(change.current_value)
  const newNumeric = parseCashValue(change.suggested_value)
  if (oldNumeric === -1 || newNumeric === -1) return null

  return { oldValue: change.current_value, difference: newNumeric - oldNumeric }
}

export function getItemTypeColor(type: string): string {
  switch (normalizeCase(type)) {
    case 'Vehicle':
      return 'hsl(0, 64%, 48%)'
    case 'Spoiler':
      return '#8B5A00'
    case 'Rim':
      return '#6335B1'
    case 'Tire Sticker':
      return '#1CA1BD'
    case 'Tire Style':
      return '#2E7D32'
    case 'Drift':
      return '#CC3700'
    case 'Body Color':
      return '#8A2BE2'
    case 'Texture':
      return '#4A5568'
    case 'Hyperchrome':
      return '#C2185B'
    case 'Furniture':
      return '#8B4513'
    case 'Horn':
      return '#1976D2'
    case 'Weapon Skin':
      return '#2E7D32'
    default:
      return '#124e66'
  }
}

export function getDemandColor(demand: string | null | undefined): string {
  switch (normalizeCase(demand)) {
    case 'Close To None':
      return 'bg-gray-600 text-white'
    case 'Very Low':
      return 'bg-red-600 text-white'
    case 'Low':
      return 'bg-orange-700 text-white'
    case 'Below Average':
      return 'bg-amber-500 text-black'
    case 'Average':
      return 'bg-[#D0F03C] text-black'
    case 'Decent':
      return 'bg-green-600 text-white'
    case 'High':
      return 'bg-blue-600 text-white'
    case 'Very High':
      return 'bg-purple-600 text-white'
    default:
      return 'bg-gray-600 text-white'
  }
}

export function getTrendColor(trend: string | null | undefined): string {
  switch (normalizeCase(trend)) {
    case 'Dropping':
      return 'bg-rose-600 text-white'
    case 'Unstable':
      return 'bg-amber-600 text-white'
    case 'Hoarded':
      return 'bg-violet-600 text-white'
    case 'Manipulated':
      return 'bg-yellow-600 text-black'
    case 'Stable':
      return 'bg-gray-500 text-white'
    case 'Recovering':
      return 'bg-orange-600 text-white'
    case 'Rising':
      return 'bg-blue-700 text-white'
    case 'Hyped':
      return 'bg-pink-500 text-white'
    default:
      return 'bg-gray-600 text-white'
  }
}

const IMAGE_BASE = 'https://assets.jailbreakchangelogs.com/assets/images/items'
const PLACEHOLDER_IMAGE =
  'https://assets.jailbreakchangelogs.com/assets/images/Placeholder.webp'

const TYPE_MAPPINGS: Record<string, string> = {
  'body color': 'body colors',
  drift: 'drifts',
  furniture: 'furnitures',
  hyperchrome: 'hyperchromes',
  rim: 'rims',
  spoiler: 'spoilers',
  texture: 'textures',
  'tire sticker': 'tire stickers',
  'tire style': 'tire styles',
  vehicle: 'vehicles',
  'weapon skin': 'weapon skins'
}

const VIDEO_ITEM_NAMES = new Set(['HyperShift', 'Gamer TV Set', 'Arcade Racer'])

export function getItemImagePath(type: string, name: string): string {
  if (VIDEO_ITEM_NAMES.has(name)) {
    const normalizedType = type.toLowerCase()
    const mappedType = TYPE_MAPPINGS[normalizedType] || normalizedType
    return `${IMAGE_BASE}/${mappedType}/${name}.webp`
  }
  if (type.toLowerCase() === 'horn') {
    return 'https://assets.jailbreakchangelogs.com/assets/audios/horns/thumbnails/480p/horn_thumbnail.webp'
  }
  if (type.toLowerCase() === 'drift') {
    return `${IMAGE_BASE}/drifts/thumbnails/${name}.webp`
  }
  const normalizedType = type.toLowerCase()
  const mappedType = TYPE_MAPPINGS[normalizedType] || normalizedType
  return `${IMAGE_BASE}/480p/${mappedType}/${name}.webp`
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget
  if (img.src !== PLACEHOLDER_IMAGE) {
    img.src = PLACEHOLDER_IMAGE
    img.onerror = null
  }
}

export type ItemTypeFilter =
  | 'vehicles'
  | 'hyperchromes'
  | 'rims'
  | 'textures'
  | 'spoilers'
  | 'tire-styles'
  | 'tire-stickers'
  | 'horns'
  | 'body-colors'
  | 'drifts'
  | 'weapon-skins'
  | 'furnitures'

export const ITEM_TYPE_FILTERS: readonly { value: ItemTypeFilter; label: string; type: string }[] = [
  { value: 'vehicles', label: 'Vehicles', type: 'vehicle' },
  { value: 'hyperchromes', label: 'HyperChromes', type: 'hyperchrome' },
  { value: 'rims', label: 'Rims', type: 'rim' },
  { value: 'textures', label: 'Textures', type: 'texture' },
  { value: 'spoilers', label: 'Spoilers', type: 'spoiler' },
  { value: 'tire-styles', label: 'Tire Styles', type: 'tire style' },
  { value: 'tire-stickers', label: 'Tire Stickers', type: 'tire sticker' },
  { value: 'horns', label: 'Horns', type: 'horn' },
  { value: 'body-colors', label: 'Body Colors', type: 'body color' },
  { value: 'drifts', label: 'Drifts', type: 'drift' },
  { value: 'weapon-skins', label: 'Weapon Skins', type: 'weapon skin' },
  { value: 'furnitures', label: 'Furniture', type: 'furniture' }
]

export type ValueSort =
  | 'cash-desc'
  | 'cash-asc'
  | 'duped-desc'
  | 'duped-asc'
  | 'alpha-asc'
  | 'alpha-desc'
  | 'random'
  | 'unique-circulation-desc'
  | 'unique-circulation-asc'
  | 'last-updated-desc'
  | 'last-updated-asc'
  | 'demand-desc'
  | 'demand-asc'

export const VALUE_SORT_GROUPS: readonly { label: string; options: readonly { value: ValueSort; label: string }[] }[] = [
  {
    label: 'Values',
    options: [
      { value: 'cash-desc', label: 'Cash Value (High to Low)' },
      { value: 'cash-asc', label: 'Cash Value (Low to High)' },
      { value: 'duped-desc', label: 'Duped Value (High to Low)' },
      { value: 'duped-asc', label: 'Duped Value (Low to High)' }
    ]
  },
  {
    label: 'Alphabetically',
    options: [
      { value: 'alpha-asc', label: 'Name (A to Z)' },
      { value: 'alpha-desc', label: 'Name (Z to A)' },
      { value: 'random', label: 'Random' }
    ]
  },
  {
    label: 'Circulation',
    options: [
      { value: 'unique-circulation-desc', label: 'Unique Circulation (High to Low)' },
      { value: 'unique-circulation-asc', label: 'Unique Circulation (Low to High)' }
    ]
  },
  {
    label: 'Last Updated',
    options: [
      { value: 'last-updated-desc', label: 'Last Updated (Newest to Oldest)' },
      { value: 'last-updated-asc', label: 'Last Updated (Oldest to Newest)' }
    ]
  },
  {
    label: 'Demand',
    options: [
      { value: 'demand-desc', label: 'Demand (High to Low)' },
      { value: 'demand-asc', label: 'Demand (Low to High)' }
    ]
  }
]
