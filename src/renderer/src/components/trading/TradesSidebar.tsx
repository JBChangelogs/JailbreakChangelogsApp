import { useTrades } from '@renderer/contexts/TradesContext'
import { SearchInput } from '@renderer/components/ui/search-input'
import { Button } from '@renderer/components/ui/button'
import { CreateTradeAdSidebar } from '@renderer/components/trading/CreateTradeAdSidebar'

export function TradesSidebar(): React.JSX.Element {
  const { tab, setTab, searchQuery, setSearchQuery, setView, view } = useTrades()

  if (view.type === 'create') {
    return <CreateTradeAdSidebar />
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-border-primary px-3 py-2.5">
        <h1 className="text-xs font-bold uppercase tracking-wide text-quaternary-text">Trades</h1>
        <Button type="button" size="sm" className="w-full" onClick={() => setView({ type: 'create' })}>
          Create Trade Ad
        </Button>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1.5 rounded-2xl border border-border-card bg-secondary-bg p-1">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-colors ${tab === 'all' ? 'bg-button-info text-form-button-text' : 'text-secondary-text hover:text-primary-text'
              }`}
          >
            All Ads
          </button>
          <button
            type="button"
            onClick={() => setTab('mine')}
            className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-colors ${tab === 'mine' ? 'bg-button-info text-form-button-text' : 'text-secondary-text hover:text-primary-text'
              }`}
          >
            My Ads
          </button>
        </div>
      </div>

      <div className="px-3 pb-3">
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search by item name..." />
      </div>
    </div>
  )
}
