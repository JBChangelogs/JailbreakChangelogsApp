import { useTrades } from '@renderer/contexts/TradesContext'
import { Tabs } from '@renderer/components/ui/tabs'
import { SearchInput } from '@renderer/components/ui/search-input'
import { Button } from '@renderer/components/ui/button'
import { CreateTradeAdSidebar } from '@renderer/components/trading/CreateTradeAdSidebar'
import { MakeOfferSidebar } from '@renderer/components/trading/MakeOfferSidebar'

export function TradesSidebar(): React.JSX.Element {
  const { tab, setTab, searchQuery, setSearchQuery, setView, view } = useTrades()

  if (view.type === 'create') {
    return <CreateTradeAdSidebar />
  }

  if (view.type === 'offer') {
    return <MakeOfferSidebar />
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-border-primary px-3 py-2.5">
        <h1 className="text-xs font-bold uppercase tracking-wide text-quaternary-text">Trades</h1>
        <Button type="button" className="w-full text-sm!" onClick={() => setView({ type: 'create' })}>
          Create Trade Ad
        </Button>
      </div>

      <div className="p-3">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: 'All Ads' },
            { value: 'mine', label: 'My Ads' }
          ]}
        />
      </div>

      <div className="px-3 pb-3">
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by item name..." />
      </div>
    </div>
  )
}
