import { SidebarHeader } from '@renderer/components/ui/sidebar-header'
import { ItemSearchSelect } from '@renderer/components/values/itemdetail/ItemSearchSelect'
import { useValues, type ItemSection } from '@renderer/contexts/ValuesContext'
import type { Item } from '@shared/item'

type IconProps = { className?: string }

function Icon({ className, d }: IconProps & { d: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const SECTIONS: { id: ItemSection; label: string; d: string }[] = [
  { id: 'overview', label: 'Overview', d: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6ZM8 9h8M8 12h8M8 15h5' },
  { id: 'charts', label: 'Charts', d: 'M3 3v18h18M7 15l4-4 3 3 5-6' },
  { id: 'changes', label: 'Changes', d: 'M12 6v6l4 2m5-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
  { id: 'suggestions', label: 'Suggestions', d: 'M7.5 8.25h9m-9 3H12M2.25 12.76c0 1.6 1.12 2.99 2.7 3.23 1.09.16 2.19.29 3.3.37V21l4.18-4.18a1.15 1.15 0 0 1 .78-.33 48.3 48.3 0 0 0 5.83-.5c1.58-.23 2.71-1.62 2.71-3.23V6.74c0-1.6-1.13-3-2.71-3.23A48.4 48.4 0 0 0 12 3c-2.39 0-4.73.17-7.02.51-1.58.23-2.73 1.62-2.73 3.23v6.02Z' },
  { id: 'dupes', label: 'Dupes', d: 'M15.75 17.25v3.38c0 .62-.5 1.12-1.12 1.12h-9.76c-.62 0-1.12-.5-1.12-1.12V7.88c0-.62.5-1.13 1.12-1.13H8.25m7.5 10.5h3.38c.62 0 1.12-.5 1.12-1.12V11.25a9 9 0 0 0-9-9h-1.5c-.62 0-1.12.5-1.12 1.12v12.76c0 .62.5 1.12 1.12 1.12h6.76Z' },
  { id: 'hoarders', label: 'Hoarders', d: 'M15 19.13a9.38 9.38 0 0 0 2.63.37 9.34 9.34 0 0 0 4.12-.95 4.13 4.13 0 0 0-7.53-2.49M15 19.13v-.01c0-1.11-.29-2.16-.78-3.07M15 19.13v.1A12.32 12.32 0 0 1 8.62 21c-2.33 0-4.51-.64-6.37-1.77v-.11a6.38 6.38 0 0 1 11.96-3.07M12 6.38a3.38 3.38 0 1 1-6.75 0 3.38 3.38 0 0 1 6.75 0Zm8.25 2.25a2.63 2.63 0 1 1-5.25 0 2.63 2.63 0 0 1 5.25 0Z' }
]

export function ItemDetailSidebar({ item }: { item: Item }): React.JSX.Element {
  const { itemSection, setItemSection } = useValues()

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <SidebarHeader>
        <ItemSearchSelect key={item.id} item={item} />
      </SidebarHeader>
      <nav className="space-y-0.5 p-2">
        {SECTIONS.map(({ id, label, d }) => (
          <button
            key={id}
            type="button"
            onClick={() => setItemSection(id)}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
              itemSection === id
                ? 'bg-button-info/15 text-primary-text'
                : 'text-secondary-text hover:bg-quaternary-bg hover:text-primary-text'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" d={d} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
