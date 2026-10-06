import { useSettingsPage, type SettingsSectionId } from '@renderer/contexts/SettingsPageContext'

function ShieldIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3 4.5 6v6c0 4.5 3.2 7.6 7.5 9 4.3-1.4 7.5-4.5 7.5-9V6L12 3Z"
      />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
      />
    </svg>
  )
}

function GamepadIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="6" width="20" height="12" rx="6" />
      <path strokeLinecap="round" d="M7.5 10v4M5.5 12h4" />
      <circle cx="16" cy="9.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3ZM5 16l.8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8L5 16Z"
      />
    </svg>
  )
}

function BackIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19 8 12l7-7" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.3 3.1-6 7-6s7 2.7 7 6"
      />
    </svg>
  )
}

function GiftIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 12v9H4v-9M2 7h20v5H2V7Zm10 0v14M12 7c-1-3-3.5-4-5-2.5S6 8 9 8h3Zm0 0c1-3 3.5-4 5-2.5S18 8 15 8h-3Z"
      />
    </svg>
  )
}

const SECTIONS: { id: SettingsSectionId; label: string; icon: (props: { className?: string }) => React.JSX.Element }[] = [
  { id: 'account', label: 'Account', icon: UserIcon },
  { id: 'privacy', label: 'Privacy', icon: ShieldIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'richPresence', label: 'Rich Presence', icon: GamepadIcon },
  { id: 'gifts', label: 'Supporter Gifts', icon: GiftIcon },
  { id: 'whatsNew', label: "What's New", icon: SparklesIcon }
]

export function SettingsSidebar(): React.JSX.Element {
  const { section, setSection, close } = useSettingsPage()

  return (
    <div className="flex w-60 shrink-0 flex-col border-r border-border-primary bg-secondary-bg">
      <div className="px-4 py-4">
        <h1 className="text-xs font-bold tracking-wide text-quaternary-text uppercase">Settings</h1>
      </div>

      <nav className="flex-1 space-y-0.5 px-2">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
              section === id
                ? 'bg-button-info/15 text-primary-text'
                : 'text-secondary-text hover:bg-quaternary-bg hover:text-primary-text'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      <div className="border-t border-border-primary p-2">
        <button
          type="button"
          onClick={close}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
        >
          <BackIcon className="h-4 w-4 shrink-0" />
          Back to app
        </button>
      </div>
    </div>
  )
}
