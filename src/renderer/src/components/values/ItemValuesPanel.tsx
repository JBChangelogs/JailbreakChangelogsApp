import { formatFullValue, formatPrice, getDemandColor, getTrendColor, getValueChange } from '@renderer/lib/itemValueUtils'
import type { Item } from '@shared/item'

function ChangeChip({ difference }: { difference: number }): React.JSX.Element {
  return (
    <span
      className={`inline-flex h-5 items-center rounded-md px-1.5 text-[11px] leading-none font-semibold ${
        difference > 0 ? 'bg-status-success text-button-success-text' : 'bg-status-error text-button-danger-text'
      }`}
    >
      {difference > 0 ? '+' : '-'}
      {Math.abs(difference).toLocaleString()}
    </span>
  )
}

function Tile({ label, children, className }: { label: string; children: React.ReactNode; className?: string }): React.JSX.Element {
  return (
    <div className={`min-w-0 rounded-xl border border-border-card bg-secondary-bg px-3.5 py-3 ${className ?? ''}`}>
      <h4 className="mb-1.5 text-[11px] font-semibold tracking-wide text-secondary-text uppercase">{label}</h4>
      {children}
    </div>
  )
}

function ValueTile({ label, value, change }: { label: string; value: string; change: number | null }): React.JSX.Element {
  return (
    <Tile label={label}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate text-xl font-bold text-primary-text tabular-nums" title={value}>
          {value}
        </p>
        {change !== null && change !== 0 && <ChangeChip difference={change} />}
      </div>
    </Tile>
  )
}

function Pill({ label, color }: { label: string; color: string }): React.JSX.Element {
  return (
    <span className={`inline-flex max-w-full items-center rounded-lg px-2.5 py-1 text-sm leading-tight font-bold break-words ${color}`}>
      {label}
    </span>
  )
}

export function ItemValuesPanel({ item }: { item: Item }): React.JSX.Element {
  const cashChange = getValueChange(item.recent_changes, 'cash_value')
  const dupedChange = getValueChange(item.recent_changes, 'duped_value')
  const demandLabel = !item.demand || item.demand === 'N/A' ? 'Unknown' : item.demand
  const dupedDemandLabel = !item.duped_demand || item.duped_demand === 'N/A' ? 'N/A' : item.duped_demand
  const trendLabel = !item.trend || item.trend === 'N/A' ? 'Unknown' : item.trend

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2.5">
      <ValueTile label="Cash Value" value={formatFullValue(item.cash_value)} change={cashChange?.difference ?? null} />
      <ValueTile label="Duped Value" value={formatFullValue(item.duped_value)} change={dupedChange?.difference ?? null} />
      <Tile label="Original Price">
        <p className="truncate text-xl font-bold text-primary-text">{item.price === 'N/A' ? 'N/A' : formatPrice(item.price)}</p>
      </Tile>
      <Tile label="Demand">
        <Pill label={demandLabel} color={getDemandColor(demandLabel)} />
      </Tile>
      <Tile label="Duped Demand">
        <Pill label={dupedDemandLabel} color={getDemandColor(dupedDemandLabel)} />
      </Tile>
      <Tile label="Trend">
        <Pill label={trendLabel} color={getTrendColor(trendLabel)} />
      </Tile>
      {item.type.toLowerCase() === 'vehicle' && (
        <Tile label="Vehicle Health">
          <p className="text-xl font-bold text-primary-text">{item.health || '???'}</p>
        </Tile>
      )}
    </div>
  )
}
