import { Tabs } from '@renderer/components/ui/tabs'

export type TrackerView = 'robberies' | 'bounties'

const OPTIONS = [
  { value: 'robberies', label: 'Robberies' },
  { value: 'bounties', label: 'Bounties' }
] as const

export function TrackerViewSwitcher({
  value,
  onChange
}: {
  value: TrackerView
  onChange: (view: TrackerView) => void
}): React.JSX.Element {
  return <Tabs value={value} onChange={onChange} options={OPTIONS} />
}
