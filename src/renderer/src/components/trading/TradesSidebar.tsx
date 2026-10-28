import { useTrades } from '@renderer/contexts/TradesContext'
import { SidebarHeader } from '@renderer/components/ui/sidebar-header'
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
      <SidebarHeader>
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by item name..." />
      </SidebarHeader>
      <div className="flex flex-col gap-2 p-2">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: 'All Ads' },
            { value: 'mine', label: 'My Ads' }
          ]}
        />
        <Button type="button" className="w-full text-sm!" onClick={() => setView({ type: 'create' })}>
          Create Trade Ad
        </Button>
      </div>
    </div>
  )
}
