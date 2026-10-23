import { useCallback, useEffect, useState } from 'react'
import { endUpdatePreview, onUpdatePreview } from '@renderer/lib/updatePreview'
import type { UpdaterStatus } from '@shared/desktopApi'

export interface UpdateState {
  status: UpdaterStatus | null
  isPreview: boolean
  version: string | null
  notes: string | null
  size: number | null
  clear: () => void
}

export function useUpdateStatus(): UpdateState {
  const [status, setStatus] = useState<UpdaterStatus | null>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [details, setDetails] = useState<{ version: string | null; notes: string | null; size: number | null }>({
    version: null,
    notes: null,
    size: null
  })

  useEffect(() => {
    const apply = (next: UpdaterStatus, preview: boolean): void => {
      setIsPreview(preview)
      setStatus(next)
      if (next.state === 'checking') setDetails({ version: null, notes: null, size: null })
      if (next.state === 'available' || next.state === 'downloading' || next.state === 'downloaded') {
        setDetails((prev) => ({
          version: next.version ?? prev.version,
          notes: next.notes ?? prev.notes,
          size: (next.state === 'downloading' ? next.total : next.size) ?? prev.size
        }))
      }
    }
    const offReal = window.api.updater.onStatus((next) => {
      endUpdatePreview()
      apply(next, false)
    })
    const offPreview = onUpdatePreview((next) => apply(next, true))
    return () => {
      offReal()
      offPreview()
    }
  }, [])

  const clear = useCallback(() => {
    setIsPreview(false)
    setStatus(null)
  }, [])

  return { status, isPreview, ...details, clear }
}

export function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}
