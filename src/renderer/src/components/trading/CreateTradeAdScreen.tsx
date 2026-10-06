import { useTrades } from '@renderer/contexts/TradesContext'
import { totalCount } from '@renderer/lib/tradeItemDraft'
import { TradeItemPicker } from '@renderer/components/trading/TradeItemPicker'

export function CreateTradeAdScreen(): React.JSX.Element {
  const {
    createOffering,
    createRequesting,
    createActiveSide,
    setCreateActiveSide,
    addCreateItem,
    addCreateCustomType
  } = useTrades()

  const activeItems = createActiveSide === 'offering' ? createOffering : createRequesting

  return (
    <TradeItemPicker
      side={createActiveSide}
      onSide={setCreateActiveSide}
      onAddItem={addCreateItem}
      onAddCustomType={addCreateCustomType}
      atCap={totalCount(activeItems) >= 8}
    />
  )
}
