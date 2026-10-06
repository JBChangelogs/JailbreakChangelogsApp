import type { UserPresence } from '@shared/user'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-status-success-vibrant',
  idle: 'bg-status-warning',
  away: 'bg-status-warning',
  dnd: 'bg-status-error',
  'do not disturb': 'bg-status-error',
  busy: 'bg-status-error',
  offline: 'bg-status-neutral'
}

function colorFor(status: string): string {
  return STATUS_COLORS[status.toLowerCase()] ?? 'bg-status-neutral'
}

interface PresenceDotProps {
  presence?: UserPresence | null
  typing?: boolean
  className?: string
}

export function PresenceDot({
  presence,
  typing = false,
  className = 'h-2.5 w-2.5'
}: PresenceDotProps): React.JSX.Element | null {
  if (typing) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`${className} w-6! flex shrink-0 items-center justify-center gap-[2px] overflow-hidden rounded-full px-1 ring-2 ring-secondary-bg ${colorFor(presence?.status ?? 'offline')}`}
          >
            <span className="h-1 w-1 animate-typing-dot rounded-full bg-white [animation-delay:-0.3s]" />
            <span className="h-1 w-1 animate-typing-dot rounded-full bg-white [animation-delay:-0.15s]" />
            <span className="h-1 w-1 animate-typing-dot rounded-full bg-white" />
          </span>
        </TooltipTrigger>
        <TooltipContent>typing…</TooltipContent>
      </Tooltip>
    )
  }

  if (!presence?.status) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`${className} shrink-0 rounded-full ring-2 ring-secondary-bg transition-colors duration-300 ${colorFor(presence.status)}`}
        />
      </TooltipTrigger>
      <TooltipContent>{presence.status}</TooltipContent>
    </Tooltip>
  )
}
