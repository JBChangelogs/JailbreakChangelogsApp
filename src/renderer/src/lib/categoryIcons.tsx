export function getCategoryColor(type: string): string {
  switch (type.toLowerCase().trim()) {
    case 'vehicles':
    case 'vehicle':
      return '#c82c2c'
    case 'hyperchromes':
    case 'hyperchrome':
      return '#e91e63'
    case 'rims':
    case 'rim':
      return '#6335b1'
    case 'spoilers':
    case 'spoiler':
      return '#c18800'
    case 'body colors':
    case 'body color':
      return '#8a2be2'
    case 'textures':
    case 'texture':
      return '#708090'
    case 'tire stickers':
    case 'tire sticker':
      return '#1ca1bd'
    case 'tire styles':
    case 'tire style':
      return '#4caf50'
    case 'drifts':
    case 'drift':
      return '#ff4500'
    case 'furniture':
      return '#9c6644'
    case 'horns':
    case 'horn':
      return '#4a90e2'
    case 'weapon skins':
    case 'weapon skin':
      return '#4a6741'
    default:
      return '#708090'
  }
}

function CarIcon({ className, style }: IconProps): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11m-14 0h14m-14 0a2 2 0 0 0-2 2v4h2m14-6a2 2 0 0 1 2 2v4h-2m-14 0v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1m10 0v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1m-14 0h14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function JarIcon({ className, style }: IconProps): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h8M9 3v3.3a2 2 0 0 1-.6 1.4L6.6 9.5A3 3 0 0 0 6 11.5V19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7.5a3 3 0 0 0-.6-2L15.6 7.7a2 2 0 0 1-.6-1.4V3" />
    </svg>
  )
}

function WheelIcon({ className, style }: IconProps): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" d="M12 4v4.5M12 15.5V20M4 12h4.5M15.5 12H20M6.3 6.3l3.2 3.2M14.5 14.5l3.2 3.2M6.3 17.7l3.2-3.2M14.5 9.5l3.2-3.2" />
    </svg>
  )
}

function RocketIcon({ className, style }: IconProps): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.5c2.5 1.8 4 5 4 8.5 0 2-1 4-2 5l-2 2-2-2c-1-1-2-3-2-5 0-3.5 1.5-6.7 4-8.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15.5 6.5 18M15 15.5 17.5 18M12 18v3" />
    </svg>
  )
}

function PaintIcon({ className, style }: IconProps): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a8 8 0 0 1-3-15.4A8 8 0 0 1 21 8c0 1.5-1 2-2 2h-2.5a1.5 1.5 0 0 0 0 3H17a1 1 0 0 1 1 1 5 5 0 0 1-6 5Z" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function LayersIcon({ className, style }: IconProps): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 13 9 5 9-5" />
    </svg>
  )
}

function StickerIcon({ className, style }: IconProps): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 3.5h-6A5 5 0 0 0 3.5 8.5v6a1 1 0 0 0 .3.7l5 5a1 1 0 0 0 .7.3h6a5 5 0 0 0 5-5v-6a5 5 0 0 0-5-5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20.5V16a2 2 0 0 1 2-2h4.5" />
    </svg>
  )
}

function TireIcon({ className, style }: IconProps): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  )
}

function FireIcon({ className, style }: IconProps): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22c4 0 6.5-2.5 6.5-6 0-2.5-1.5-4-2.5-5.5.3 2-1 3-1.7 2 .5-3-1-5.5-3.3-7 0 2.5-1.2 4-2.5 5.5C7 12.5 5.5 14 5.5 16c0 3.5 2.5 6 6.5 6Z" />
    </svg>
  )
}

function HomeIcon({ className, style }: IconProps): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 11 9-7 9 7M5.5 9.5V20a1 1 0 0 0 1 1H9v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6h2.5a1 1 0 0 0 1-1V9.5" />
    </svg>
  )
}

function HornIcon({ className, style }: IconProps): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10v4a1 1 0 0 0 1 1h2l4.5 4.5A1 1 0 0 0 12 19V5a1 1 0 0 0-1.5-.9L6 9H4a1 1 0 0 0-1 1Z" />
      <path strokeLinecap="round" d="M16 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" />
    </svg>
  )
}

function GunIcon({ className, style }: IconProps): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 14h9l2-3h5a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-1v3h-3v-3h-3l-2 3H8v-3H5a2 2 0 0 1-2-2Z" />
    </svg>
  )
}

function SnowflakeIcon({ className, style }: IconProps): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" d="M12 2v20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1M2 12h20" />
    </svg>
  )
}

function ClockIcon({ className, style }: IconProps): React.JSX.Element {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3.5 2" />
    </svg>
  )
}

interface IconProps {
  className?: string
  style?: React.CSSProperties
}

export function getCategoryIcon(type: string): ((props: IconProps) => React.JSX.Element) | null {
  switch (type.toLowerCase().trim()) {
    case 'vehicles':
    case 'vehicle':
      return CarIcon
    case 'hyperchromes':
    case 'hyperchrome':
      return JarIcon
    case 'rims':
    case 'rim':
      return WheelIcon
    case 'spoilers':
    case 'spoiler':
      return RocketIcon
    case 'body colors':
    case 'body color':
      return PaintIcon
    case 'textures':
    case 'texture':
      return LayersIcon
    case 'tire stickers':
    case 'tire sticker':
      return StickerIcon
    case 'tire styles':
    case 'tire style':
      return TireIcon
    case 'drifts':
    case 'drift':
      return FireIcon
    case 'furniture':
      return HomeIcon
    case 'horns':
    case 'horn':
      return HornIcon
    case 'weapon skins':
    case 'weapon skin':
      return GunIcon
    default:
      return null
  }
}

export function CategoryIconBadge({
  type,
  isLimited,
  isSeasonal,
  className = 'h-5 w-5'
}: {
  type: string
  isLimited: boolean
  isSeasonal: boolean
  className?: string
}): React.JSX.Element | null {
  const wrap = (node: React.ReactNode): React.JSX.Element => (
    <div className="rounded-full bg-primary-bg/50 p-1.5">{node}</div>
  )

  if (isSeasonal) return wrap(<SnowflakeIcon className={className} style={{ color: '#40c0e7' }} />)
  if (isLimited) return wrap(<ClockIcon className={className} style={{ color: '#ffd700' }} />)

  const CategoryIcon = getCategoryIcon(type)
  if (CategoryIcon) return wrap(<CategoryIcon className={className} style={{ color: getCategoryColor(type) }} />)

  return null
}
