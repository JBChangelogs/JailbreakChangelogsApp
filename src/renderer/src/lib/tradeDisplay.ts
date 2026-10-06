import { parseCashValue } from '@renderer/lib/itemValueUtils'
import { isCustomTradeItemId, type TradeAd, type TradeItemWire } from '@shared/trading'

export interface SideValue {
  total: number
  cash: number
  duped: number
  hasDuped: boolean
}

export function sideValue(items: TradeItemWire[]): SideValue {
  let cash = 0
  let duped = 0
  let hasDuped = false
  for (const item of items) {
    if (isCustomTradeItemId(item.id)) continue
    const amount = item.amount ?? 1
    if (item.duped) {
      hasDuped = true
      duped += Math.max(0, parseCashValue(item.info?.duped_value ?? null)) * amount
    } else {
      cash += Math.max(0, parseCashValue(item.info?.cash_value ?? null)) * amount
    }
  }
  return { total: cash + duped, cash, duped, hasDuped }
}

export function sideTotalValue(items: TradeItemWire[]): number {
  return sideValue(items).total
}

export function isTradeExpired(ad: TradeAd): boolean {
  return ad.expires * 1000 < Date.now()
}

export function formatTimeLeft(unixSeconds: number): string {
  const minutes = Math.max(0, Math.floor((unixSeconds * 1000 - Date.now()) / 60000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
