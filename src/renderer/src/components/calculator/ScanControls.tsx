import { useEffect, useState } from 'react'
import { useCalculator } from '@renderer/contexts/CalculatorContext'
import { Button } from '@renderer/components/ui/button'
import { Switch } from '@renderer/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/ui/tooltip'
import { showToast } from '@renderer/lib/toast'
import { track } from '@renderer/lib/analytics'
import type { AutoScanSettings, ScannerStatus } from '@shared/tradeScan'

function SnipIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    </svg>
  )
}

type Availability =
  | { state: 'checking' }
  | { state: 'ready' }
  | { state: 'unavailable'; reason: string }
  | { state: 'installable'; size: number; reason: string }
  | { state: 'installing'; percent: number }

function toAvailability(s: ScannerStatus): Availability {
  if (s.available) return { state: 'ready' }
  if (s.installSize) return { state: 'installable', size: s.installSize, reason: s.reason }
  return { state: 'unavailable', reason: s.reason }
}

function formatSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`
}

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
        if (!cancelled) setAvailability(toAvailability(s))
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

  const install = async (): Promise<void> => {
    setAvailability({ state: 'installing', percent: 0 })
    const off = window.api.scanner.onInstallProgress(({ transferred, total }) =>
      setAvailability({ state: 'installing', percent: total ? Math.floor((transferred / total) * 100) : 0 })
    )
    try {
      const next = toAvailability(await window.api.scanner.install())
      setAvailability(next)
      if (next.state !== 'ready') showToast("Couldn't download the scanner", { description: 'Please try again.' })
    } catch {
      setAvailability({ state: 'unavailable', reason: "The scanner couldn't be downloaded." })
    } finally {
      off()
    }
  }

  const snip = async (): Promise<void> => {
    setBusy(true)
    try {
      const res = await window.api.scanner.snip()
      if (!res) return
      if (!res.ok) {
        track('trade_scan_failed', { mode: 'snip', code: res.code })
        showToast("Couldn't scan that area", { description: res.message })
      } else if (!applyScan(res)) {
        showToast('No trade items were found in that area.')
      }
    } finally {
      setBusy(false)
    }
  }

  const toggleAuto = async (enabled: boolean): Promise<void> => {
    setAuto(await window.api.scanner.setAutoEnabled(enabled))
  }

  const scanButton =
    availability.state === 'installable' || availability.state === 'installing' ? (
      <Button type="button" size="sm" disabled={availability.state === 'installing'} onClick={() => void install()}>
        <SnipIcon className="h-3.5 w-3.5" />
        {availability.state === 'installing'
          ? `Downloading scanner… ${availability.percent}%`
          : `Download scanner (${formatSize(availability.size)})`}
      </Button>
    ) : (
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
          While you're in a Jailbreak trading server, finds the trade in your Roblox window and keeps the calculator
          in sync with it, even behind other windows. Clears it when you leave the trade menu.
        </TooltipContent>
      </Tooltip>
      {availability.state === 'unavailable' || availability.state === 'installable' ? (
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
