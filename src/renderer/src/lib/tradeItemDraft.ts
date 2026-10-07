import { CUSTOM_TRADE_TYPES, isCustomTradeItemId, type TradeItemWire } from '@shared/trading'
import type { CreateTradeItemPayload } from '@renderer/lib/tradesApi'
import type { Item } from '@shared/item'
import { parseCashValue } from '@renderer/lib/itemValueUtils'

export interface TradeItemDraft {
  id: string
  name: string
  type: string
  cashValue?: string
  dupedValue?: string
  duped: boolean
  og: boolean
  amount: number
}

export const MAX_ITEMS_PER_SIDE = 8

function draftKey(id: string, duped: boolean, og: boolean): string {
  return `${id}:${duped}:${og}`
}

export type TradeItemDraftKey = { id: string; duped: boolean; og: boolean }

// Value of a side, counting duped items at their duped value. Custom types (Adds, Overpays…) count as 0.
export function sideValue(items: TradeItemDraft[]): number {
  return items
    .filter((item) => !isCustomTradeItemId(item.id))
    .reduce(
      (sum, item) =>
        sum + Math.max(0, parseCashValue((item.duped ? item.dupedValue : item.cashValue) ?? null)) * item.amount,
      0
    )
}

export function totalCount(items: TradeItemDraft[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

function upsertRow(items: TradeItemDraft[], row: TradeItemDraft): TradeItemDraft[] {
  const key = draftKey(row.id, row.duped, row.og)
  const existingIndex = items.findIndex((i) => draftKey(i.id, i.duped, i.og) === key)
  if (existingIndex >= 0) {
    return items.map((i, idx) => (idx === existingIndex ? { ...i, amount: i.amount + row.amount } : i))
  }
  return [...items, row]
}

export function addItemToSide(
  items: TradeItemDraft[],
  item: Item,
  duped: boolean,
  og: boolean,
  max = MAX_ITEMS_PER_SIDE
): TradeItemDraft[] {
  if (totalCount(items) >= max) return items
  return upsertRow(items, {
    id: String(item.id),
    name: item.name,
    type: item.type,
    cashValue: item.cash_value,
    dupedValue: item.duped_value,
    duped,
    og,
    amount: 1
  })
}

export function addCustomTypeToSide(items: TradeItemDraft[], customId: string, max = MAX_ITEMS_PER_SIDE): TradeItemDraft[] {
  if (totalCount(items) >= max) return items
  if (items.some((i) => i.id === customId)) return items
  const label = CUSTOM_TRADE_TYPES.find((t) => t.id === customId)?.label ?? customId
  return [...items, { id: customId, name: label, type: 'Custom', duped: false, og: false, amount: 1 }]
}

export function removeAmountFromSide(items: TradeItemDraft[], key: TradeItemDraftKey, amount: number): TradeItemDraft[] {
  const index = items.findIndex((i) => draftKey(i.id, i.duped, i.og) === draftKey(key.id, key.duped, key.og))
  if (index < 0) return items
  const current = items[index]
  if (current.amount <= amount) return items.filter((_, idx) => idx !== index)
  return items.map((i, idx) => (idx === index ? { ...i, amount: i.amount - amount } : i))
}

export function removeRowFromSide(items: TradeItemDraft[], key: TradeItemDraftKey): TradeItemDraft[] {
  return items.filter((i) => draftKey(i.id, i.duped, i.og) !== draftKey(key.id, key.duped, key.og))
}

export function setConditionOnSide(
  items: TradeItemDraft[],
  key: TradeItemDraftKey,
  next: { duped: boolean; og: boolean }
): TradeItemDraft[] {
  const index = items.findIndex((i) => draftKey(i.id, i.duped, i.og) === draftKey(key.id, key.duped, key.og))
  if (index < 0) return items
  const current = items[index]
  if (current.duped === next.duped && current.og === next.og) return items
  const rest = items.filter((_, idx) => idx !== index)
  return upsertRow(rest, { ...current, duped: next.duped, og: next.og })
}

export function addRowToSide(items: TradeItemDraft[], row: TradeItemDraft, max = MAX_ITEMS_PER_SIDE): TradeItemDraft[] {
  if (totalCount(items) >= max) return items
  return upsertRow(items, row)
}

export function toCreatePayload(items: TradeItemDraft[]): CreateTradeItemPayload[] {
  return items.map((item) =>
    isCustomTradeItemId(item.id)
      ? { id: item.id }
      : { id: item.id, amount: item.amount, duped: item.duped, og: item.og }
  )
}

export function fromWireItems(items: TradeItemWire[]): TradeItemDraft[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name ?? item.id,
    type: item.type ?? (isCustomTradeItemId(item.id) ? 'Custom' : ''),
    cashValue: item.info?.cash_value ?? undefined,
    dupedValue: item.info?.duped_value ?? undefined,
    duped: item.duped ?? false,
    og: item.og ?? false,
    amount: item.amount ?? 1
  }))
}
