import { formatFullValue, formatPrice, getDemandColor, getTrendColor, getValueChange } from '@renderer/lib/itemValueUtils'
import type { Item } from '@shared/item'

function BanknotesIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 20.25 4.5H3.75A2.25 2.25 0 0 0 1.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  )
}

function ChangeChip({ difference }: { difference: number }): React.JSX.Element {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-lg px-2 text-xs leading-none font-semibold text-white ${
        difference > 0 ? 'bg-status-success' : 'bg-status-error'
      }`}
    >
      {difference > 0 ? '+' : '-'}
      {Math.abs(difference).toLocaleString()}
    </span>
  )
}

function ValueCell({ label, value, change }: { label: string; value: string; change: number | null }): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border-card bg-tertiary-bg p-4">
      <div className="mb-2 flex items-center gap-2">
        <h4 className="text-sm font-semibold tracking-wide text-secondary-text uppercase">{label}</h4>
        {change !== null && change !== 0 && <ChangeChip difference={change} />}
      </div>
      <p className="text-3xl font-bold text-primary-text">{value}</p>
    </div>
  )
}

export function ItemValuesPanel({ item }: { item: Item }): React.JSX.Element {
  const cashChange = getValueChange(item.recent_changes, 'cash_value')
  const dupedChange = getValueChange(item.recent_changes, 'duped_value')
  const hasNoPrice = item.price === 'N/A'
  const priceParts = hasNoPrice ? [] : formatPrice(item.price).split(' / ')
  const demandLabel = !item.demand || item.demand === 'N/A' ? 'Unknown' : item.demand
  const dupedDemandLabel = !item.duped_demand || item.duped_demand === 'N/A' ? 'N/A' : item.duped_demand
  const trendLabel = !item.trend || item.trend === 'N/A' ? 'Unknown' : item.trend

  return (
    <div className="space-y-6 rounded-2xl border border-border-card bg-secondary-bg p-6 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-button-info/20">
          <BanknotesIcon className="h-6 w-6 text-link" />
        </div>
        <h3 className="text-2xl font-bold text-primary-text">Item Values</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ValueCell label="Cash Value" value={formatFullValue(item.cash_value)} change={cashChange?.difference ?? null} />
        <ValueCell label="Duped Value" value={formatFullValue(item.duped_value)} change={dupedChange?.difference ?? null} />

        <div className="rounded-lg border border-border-card bg-tertiary-bg p-4">
          <h4 className="mb-2 text-sm font-semibold tracking-wide text-secondary-text uppercase">Original Price</h4>
          {hasNoPrice ? (
            <p className="text-3xl font-bold text-primary-text">N/A</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {priceParts.map((part, index) => (
                <span key={index} className="flex items-center gap-1 text-3xl font-bold text-primary-text">
                  {index > 0 && <span className="mr-1">/</span>}
                  {part}
                </span>
              ))}
            </div>
          )}
        </div>

        {item.type.toLowerCase() === 'vehicle' && (
          <div className="rounded-lg border border-border-card bg-tertiary-bg p-4">
            <h4 className="mb-2 text-sm font-semibold tracking-wide text-secondary-text uppercase">Vehicle Health</h4>
            <p className="text-3xl font-bold text-primary-text">{item.health || '???'}</p>
          </div>
        )}

        <div className="grid grid-cols-2 rounded-lg border border-border-card bg-tertiary-bg">
          <div className="p-4">
            <h4 className="mb-2 text-sm font-semibold tracking-wide text-secondary-text uppercase">Demand</h4>
            <span
              className={`inline-flex max-w-full items-center justify-center rounded-lg px-3 py-1.5 text-center text-lg leading-tight font-bold break-words ${getDemandColor(demandLabel)}`}
            >
              {demandLabel}
            </span>
          </div>
          <div className="border-l border-border-card p-4">
            <h4 className="mb-2 text-sm font-semibold tracking-wide text-secondary-text uppercase">Duped Demand</h4>
            <span
              className={`inline-flex max-w-full items-center justify-center rounded-lg px-3 py-1.5 text-center text-lg leading-tight font-bold break-words ${getDemandColor(dupedDemandLabel)}`}
            >
              {dupedDemandLabel}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-border-card bg-tertiary-bg p-4">
          <h4 className="mb-2 text-sm font-semibold tracking-wide text-secondary-text uppercase">Trend</h4>
          <span className={`inline-flex h-8 items-center rounded-lg px-3 text-lg leading-none font-bold ${getTrendColor(trendLabel)}`}>
            {trendLabel}
          </span>
        </div>
      </div>

      {item.notes && item.notes !== 'N/A' && item.notes.trim() !== '' && (
        <div className="rounded-lg border border-border-card bg-tertiary-bg p-4">
          <h4 className="mb-2 text-sm font-semibold tracking-wide text-secondary-text uppercase">Item Notes</h4>
          <p className="text-lg font-medium text-primary-text">{item.notes}</p>
        </div>
      )}
    </div>
  )
}
