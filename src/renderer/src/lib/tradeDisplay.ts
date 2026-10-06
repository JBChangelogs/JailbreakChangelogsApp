import { parseCashValue } from '@renderer/lib/itemValueUtils'
import { isCustomTradeItemId, type TradeAd, type TradeItemWire } from '@shared/trading'

export function sideTotalValue(items: TradeItemWire[], useDupedValue = false): number {
  return items
    .filter((item) => !isCustomTradeItemId(item.id))
    .reduce((sum, item) => {
      const raw = useDupedValue ? item.info?.duped_value : item.info?.cash_value
      const value = parseCashValue(raw ?? null)
      return sum + Math.max(0, value) * (item.amount ?? 1)
    }, 0)
}

export function isTradeExpired(ad: TradeAd): boolean {
  return ad.expires * 1000 < Date.now()
}
