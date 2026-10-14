import { useTrades, type OfferOrigin } from '@renderer/contexts/TradesContext'
import { totalCount } from '@renderer/lib/tradeItemDraft'
import { TradeItemPicker } from '@renderer/components/trading/TradeItemPicker'
import { TradesHeader } from '@renderer/components/trading/TradesHeader'

export function MakeOfferScreen({ tradeId, from }: { tradeId: number; from: OfferOrigin }): React.JSX.Element {
  const { offer, setView } = useTrades()
  const { composer, activeSide, setActiveSide } = offer

  return (
    <TradeItemPicker
      header={<TradesHeader title={`Offer on #${tradeId}`} onBack={() => setView(from === 'list' ? { type: 'list' } : { type: 'detail', id: tradeId })} />}
      side={activeSide}
      onSide={setActiveSide}
      onAddItem={(item, duped, og, side) => composer.addItem(side, item, duped, og)}
      onAddCustomType={(customId, side) => composer.addCustomType(side, customId)}
      atCap={totalCount(activeSide === 'offering' ? composer.offering : composer.requesting) >= 8}
    />
  )
}
