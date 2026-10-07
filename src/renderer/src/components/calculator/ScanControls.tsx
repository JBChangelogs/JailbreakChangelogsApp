import { useEffect, useState } from 'react'
import { useCalculator } from '@renderer/contexts/CalculatorContext'
import { Button } from '@renderer/components/ui/button'
import { Switch } from '@renderer/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { showToast } from '@renderer/lib/toast'
import type { AutoScanSettings } from '@shared/tradeScan'

function SnipIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    </svg>
  )
}

type Availability = { state: 'checking' } | { state: 'ready' } | { state: 'unavailable'; reason: string }

export function ScanControls(): React.JSX.Element {
  const { applyScan } = useCalculator()
  const [availability, setAvailability] = useState<Availability>({ state: 'checking' })
  const [auto, setAuto] = useState<AutoScanSettings | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.api.scanner
      .status()
      .then((s) => {
        if (!cancelled) setAvailability(s.available ? { state: 'ready' } : { state: 'unavailable', reason: s.reason })
      })
      .catch(() => {
        if (!cancelled) setAvailability({ state: 'unavailable', reason: "The scanner couldn't start." })
      })
    void window.api.scanner.getAuto().then((s) => !cancelled && setAuto(s))
    return () => {
      cancelled = true
    }
  }, [])

  const disabled = availability.state !== 'ready' || busy

  const snip = async (): Promise<void> => {
    setBusy(true)
    try {
      const res = await window.api.scanner.snip()
      if (!res) return
      if (!res.ok) {
        showToast("Couldn't scan that area", { description: res.message })
      } else if (!applyScan(res)) {
        showToast('No trade items were found in that area.')
      }
    } finally {
      setBusy(false)
    }
  }

  const pickArea = async (): Promise<AutoScanSettings> => {
    setBusy(true)
    try {
      const next = await window.api.scanner.pickAutoArea()
      setAuto(next)
      return next
    } finally {
      setBusy(false)
    }
  }

  const toggleAuto = async (enabled: boolean): Promise<void> => {
    // Auto scan needs an area; ask for one the first time it's turned on.
    if (enabled && !auto?.area && !(await pickArea()).area) return
    setAuto(await window.api.scanner.setAutoEnabled(enabled))
  }

  const scanButton = (
    <Button type="button" size="sm" disabled={disabled} onClick={() => void snip()}>
      <SnipIcon className="h-3.5 w-3.5" />
      Scan trade
    </Button>
  )

  return (
    <div className="flex items-center gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <label className={`flex items-center gap-2 text-xs text-secondary-text ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
            <Switch checked={auto?.enabled ?? false} disabled={disabled || !auto} onCheckedChange={(v) => void toggleAuto(v)} />
            Auto scan
          </label>
        </TooltipTrigger>
        <TooltipContent className="max-w-60">
          While you're in a Jailbreak trading server, keeps the calculator in sync with the open trade, and clears
          it when you leave the trade menu.
        </TooltipContent>
      </Tooltip>
      {auto?.area && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => void pickArea()}
          className="text-xs text-link hover:underline disabled:opacity-50"
        >
          Set area
        </button>
      )}
      {availability.state === 'unavailable' ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{scanButton}</span>
          </TooltipTrigger>
          <TooltipContent>{availability.reason}</TooltipContent>
        </Tooltip>
      ) : (
        scanButton
      )}
    </div>
  )
}
