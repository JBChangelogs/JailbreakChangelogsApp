import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'

export function MessagesIcon({ className = 'h-4.5 w-4.5' }: { className?: string }): React.JSX.Element {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
            />
        </svg>
    )
}

function RobberyIcon(): React.JSX.Element {
    return (
        <svg
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4.5 w-4.5"
        >
            <path d="M7 13.5c3.5 0 6-1.238 6-3.994c0-2.995-1.5-4.992-4.5-6.49l1.18-1.518A.658.658 0 0 0 9.12.5H4.88a.66.66 0 0 0-.56.998L5.5 3.026C2.5 4.534 1 6.531 1 9.526C1 12.262 3.5 13.5 7 13.5" />
            <path d="M8.383 6.806a1.08 1.08 0 0 0-1.022-.723h-.838a.967.967 0 0 0-.207 1.912l1.277.28a1.084 1.084 0 0 1-.232 2.142H6.64c-.472 0-.873-.302-1.022-.722M7 6.083V5m0 6.5v-1.083" />
        </svg>
    )
}

function GemIcon(): React.JSX.Element {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12l4 6-10 12L2 9Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 9h20M9 3l3 6 3-6M8 9l4 12 4-12" />
        </svg>
    )
}

function TradesIcon(): React.JSX.Element {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4 4 4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8v12m0 0 4-4m-4 4-4-4" />
        </svg>
    )
}

function CalculatorIcon(): React.JSX.Element {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4" />
        </svg>
    )
}

function DupeFinderIcon(): React.JSX.Element {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5">
            <rect x="8" y="8" width="14" height="14" rx="2" />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
            />
        </svg>
    )
}

export type HomeTab = 'messages' | 'tracker' | 'values' | 'calculator' | 'dupefinder' | 'trades'

interface NavItemProps {
    active?: boolean
    label: string
    badge?: number
    onClick?: () => void
    children: ReactNode
}

function NavItem({ active, label, badge, onClick, children }: NavItemProps): React.JSX.Element {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={onClick}
                    aria-label={label}
                    className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${active
                        ? 'bg-button-info text-form-button-text'
                        : 'text-secondary-text hover:bg-quaternary-bg hover:text-primary-text'
                        }`}
                >
                    {children}
                    {!!badge && badge > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-card-tag-bg px-1 text-[9px] font-semibold text-card-tag-text">
                            {badge > 99 ? '99+' : badge}
                        </span>
                    )}
                </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
    )
}

export function NavBar({
    activeTab,
    onSelect,
    unreadCount
}: {
    activeTab: HomeTab
    onSelect: (tab: HomeTab) => void
    unreadCount: number
}): React.JSX.Element {
    return (
        <div className="flex shrink-0 items-center justify-center gap-1 border-b border-border-primary px-2 py-2">
            <NavItem
                label="Messages"
                active={activeTab === 'messages'}
                badge={activeTab === 'messages' ? 0 : unreadCount}
                onClick={() => onSelect('messages')}
            >
                <MessagesIcon />
            </NavItem>
            <NavItem label="Trades" active={activeTab === 'trades'} onClick={() => onSelect('trades')}>
                <TradesIcon />
            </NavItem>
            <NavItem
                label="Robbery & Bounty Tracker"
                active={activeTab === 'tracker'}
                onClick={() => onSelect('tracker')}
            >
                <RobberyIcon />
            </NavItem>
            <NavItem label="Values" active={activeTab === 'values'} onClick={() => onSelect('values')}>
                <GemIcon />
            </NavItem>
            <NavItem label="Value Calculator" active={activeTab === 'calculator'} onClick={() => onSelect('calculator')}>
                <CalculatorIcon />
            </NavItem>
            <NavItem label="Dupe Finder" active={activeTab === 'dupefinder'} onClick={() => onSelect('dupefinder')}>
                <DupeFinderIcon />
            </NavItem>
        </div>
    )
}
