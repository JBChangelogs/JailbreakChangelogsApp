import { useTrades } from '@renderer/contexts/TradesContext'
import { totalCount } from '@renderer/lib/tradeItemDraft'
import { TradeItemPicker } from '@renderer/components/trading/TradeItemPicker'
import { TradesHeader } from '@renderer/components/trading/TradesHeader'

export function CreateTradeAdScreen(): React.JSX.Element {
  const {
    createOffering,
    createRequesting,
    createActiveSide,
    setCreateActiveSide,
    addCreateItem,
    addCreateCustomType,
    setView
  } = useTrades()

  const activeItems = createActiveSide === 'offering' ? createOffering : createRequesting

  return (
    <TradeItemPicker
      header={<TradesHeader title="Create Trade Ad" onBack={() => setView({ type: 'list' })} />}
      side={createActiveSide}
      onSide={setCreateActiveSide}
      onAddItem={addCreateItem}
      onAddCustomType={addCreateCustomType}
      atCap={totalCount(activeItems) >= 8}
    />
  )
}
