import { useState } from 'react'
import {
  addCustomTypeToSide,
  addItemToSide,
  addRowToSide,
  removeOneFromSide,
  removeRowFromSide,
  setConditionOnSide,
  type TradeItemDraft,
  type TradeItemDraftKey
} from '@renderer/lib/tradeItemDraft'
import type { Item } from '@shared/item'

export type TradeSide = 'offering' | 'requesting'

export function useTradeComposer(initial?: { offering?: TradeItemDraft[]; requesting?: TradeItemDraft[] }): {
  offering: TradeItemDraft[]
  requesting: TradeItemDraft[]
  addItem: (side: TradeSide, item: Item, duped: boolean, og: boolean) => void
  addCustomType: (side: TradeSide, customId: string) => void
  removeOne: (side: TradeSide, key: TradeItemDraftKey) => void
  removeRow: (side: TradeSide, key: TradeItemDraftKey) => void
  setCondition: (side: TradeSide, key: TradeItemDraftKey, next: { duped: boolean; og: boolean }) => void
  moveToOtherSide: (side: TradeSide, key: TradeItemDraftKey) => void
  reset: () => void
} {
  const [offering, setOffering] = useState<TradeItemDraft[]>(initial?.offering ?? [])
  const [requesting, setRequesting] = useState<TradeItemDraft[]>(initial?.requesting ?? [])

  const addItem = (side: TradeSide, item: Item, duped: boolean, og: boolean): void => {
    const setter = side === 'offering' ? setOffering : setRequesting
    setter((prev) => addItemToSide(prev, item, duped, og))
  }

  const addCustomType = (side: TradeSide, customId: string): void => {
    const setter = side === 'offering' ? setOffering : setRequesting
    setter((prev) => addCustomTypeToSide(prev, customId))
  }

  const removeOne = (side: TradeSide, key: TradeItemDraftKey): void => {
    const setter = side === 'offering' ? setOffering : setRequesting
    setter((prev) => removeOneFromSide(prev, key))
  }

  const removeRow = (side: TradeSide, key: TradeItemDraftKey): void => {
    const setter = side === 'offering' ? setOffering : setRequesting
    setter((prev) => removeRowFromSide(prev, key))
  }

  const setCondition = (side: TradeSide, key: TradeItemDraftKey, next: { duped: boolean; og: boolean }): void => {
    const setter = side === 'offering' ? setOffering : setRequesting
    setter((prev) => setConditionOnSide(prev, key, next))
  }

  const moveToOtherSide = (side: TradeSide, key: TradeItemDraftKey): void => {
    const fromItems = side === 'offering' ? offering : requesting
    const row = fromItems.find((i) => i.id === key.id && i.duped === key.duped && i.og === key.og)
    if (!row) return
    const toSide: TradeSide = side === 'offering' ? 'requesting' : 'offering'
    const toItems = toSide === 'offering' ? offering : requesting
    const afterAdd = addRowToSide(toItems, row)
    if (afterAdd === toItems) return
    const fromSetter = side === 'offering' ? setOffering : setRequesting
    const toSetter = toSide === 'offering' ? setOffering : setRequesting
    fromSetter((prev) => removeRowFromSide(prev, key))
    toSetter(afterAdd)
  }

  const reset = (): void => {
    setOffering(initial?.offering ?? [])
    setRequesting(initial?.requesting ?? [])
  }

  return { offering, requesting, addItem, addCustomType, removeOne, removeRow, setCondition, moveToOtherSide, reset }
}
