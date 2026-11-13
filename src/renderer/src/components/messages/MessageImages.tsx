import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@renderer/components/ui/dialog'
import {
  MAX_MESSAGE_IMAGES,
  MESSAGE_IMAGE_LIFETIME_MS,
  MESSAGE_IMAGE_TYPES,
  uploadMessageImage
} from '@renderer/lib/messagesApi'
import { normalizeToMs } from '@renderer/lib/messageFormatting'

export interface ImageAttachment {
  id: string
  file: File
  preview: string
  url: string | null
  error: string | null
}

export function useImageAttachments(token: string | null): {
  attachments: ImageAttachment[]
  notice: string | null
  uploading: boolean
  urls: string[]
  add: (files: Iterable<File>) => void
  remove: (id: string) => void
  clear: () => void
} {
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const countRef = useRef(0)
  countRef.current = attachments.length
  const listRef = useRef(attachments)
  listRef.current = attachments

  useEffect(() => () => listRef.current.forEach((a) => URL.revokeObjectURL(a.preview)), [])

  const patch = (id: string, change: Partial<ImageAttachment>): void =>
    setAttachments((list) => list.map((a) => (a.id === id ? { ...a, ...change } : a)))

  const add = useCallback(
    (files: Iterable<File>) => {
      if (!token) return
      const images = [...files].filter((f) => MESSAGE_IMAGE_TYPES.includes(f.type))
      const room = MAX_MESSAGE_IMAGES - countRef.current
      setNotice(
        images.length > room
          ? `You can send up to ${MAX_MESSAGE_IMAGES} images at once`
          : images.length < [...files].length
            ? 'Only PNG, JPG, WEBP and GIF images can be sent'
            : null
      )
      const accepted = images.slice(0, Math.max(room, 0))
      countRef.current += accepted.length
      for (const file of accepted) {
        const id = crypto.randomUUID()
        setAttachments((list) => [...list, { id, file, preview: URL.createObjectURL(file), url: null, error: null }])
        uploadMessageImage(token, file).then(
          (url) => patch(id, { url }),
          (err: unknown) => patch(id, { error: err instanceof Error ? err.message : 'Upload failed' })
        )
      }
    },
    [token]
  )

  const remove = useCallback((id: string) => {
    setNotice(null)
    setAttachments((list) => {
      const gone = list.find((a) => a.id === id)
      if (gone) URL.revokeObjectURL(gone.preview)
      return list.filter((a) => a.id !== id)
    })
  }, [])

  const clear = useCallback(() => {
    setNotice(null)
    setAttachments((list) => {
      list.forEach((a) => URL.revokeObjectURL(a.preview))
      return []
    })
  }, [])

  return {
    attachments,
    notice,
    uploading: attachments.some((a) => !a.url && !a.error),
    urls: attachments.flatMap((a) => (a.url ? [a.url] : [])),
    add,
    remove,
    clear
  }
}

function XIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

export function ImageIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0 0 21.75 19.5v-15A1.5 1.5 0 0 0 20.25 3H3.75A1.5 1.5 0 0 0 2.25 4.5v15A1.5 1.5 0 0 0 3.75 21Zm10.5-11.25h.008v.008h-.008V9.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
    </svg>
  )
}

export function AttachmentTray({
  attachments,
  onRemove
}: {
  attachments: ImageAttachment[]
  onRemove: (id: string) => void
}): React.JSX.Element | null {
  const [open, setOpen] = useState<ImageAttachment | null>(null)
  if (attachments.length === 0) return null
  return (
    <div className="flex gap-2 overflow-x-auto px-3 pt-1 pb-2">
      <ImageViewer src={open?.preview ?? null} file={open?.file} onClose={() => setOpen(null)} />
      {attachments.map((a) => (
        <div
          key={a.id}
          className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-secondary-bg ${
            a.error ? 'border-status-error' : 'border-border-card'
          }`}
        >
          <button
            type="button"
            aria-label="View image"
            onClick={() => setOpen(a)}
            className="block h-full w-full cursor-zoom-in"
          >
            <img src={a.preview} alt="" className={`h-full w-full object-cover ${a.url ? '' : 'opacity-50'}`} />
          </button>
          {!a.url && !a.error && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          )}
          {a.error && (
            <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/75 px-1.5 py-1 text-[10px] leading-tight text-white">
              {a.error}
            </p>
          )}
          <button
            type="button"
            aria-label="Remove image"
            onClick={() => onRemove(a.id)}
            className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white transition-colors hover:bg-status-error"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

export async function copyMessageImage(url: string): Promise<void> {
  await copyImage(new Blob([await window.api.messageImages.bytes(url)]))
}

async function copyImage(source: Blob): Promise<void> {
  const bitmap = await createImageBitmap(source)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0)
  bitmap.close()
  const png = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Encode failed'))), 'image/png')
  )
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
}

const VIEWER_ACTION =
  'rounded-md px-2 py-1 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50'

export function ImageViewer({
  src,
  file,
  onClose
}: {
  src: string | null
  file?: File
  onClose: () => void
}): React.JSX.Element {
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const remote = src?.startsWith('https://') ?? false

  useEffect(() => setStatus(null), [src])

  const run = async (action: () => Promise<string>): Promise<void> => {
    setBusy(true)
    try {
      setStatus(await action())
    } catch (err) {
      setStatus(typeof err === 'string' ? err : err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={src !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] w-auto max-w-[90vw] items-center border-none bg-transparent shadow-none">
        <DialogTitle className="sr-only">Image</DialogTitle>
        {src && <img src={src} alt="Image" className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain" />}
        {src && (
          <div className="mt-2 flex items-center gap-1">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await copyImage(file ?? new Blob([await window.api.messageImages.bytes(src)]))
                  return 'Copied'
                })
              }
              className={VIEWER_ACTION}
            >
              Copy image
            </button>
            {remote && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await window.api.messageImages.save(src)
                      return 'Saved to Downloads'
                    })
                  }
                  className={VIEWER_ACTION}
                >
                  Save image
                </button>
                <a href={src} target="_blank" rel="noreferrer" className={VIEWER_ACTION}>
                  Open original
                </a>
              </>
            )}
            {status && <span className="px-2 text-sm text-white/60">{status}</span>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function MessageImage({
  url,
  expired,
  single,
  onOpen,
  onContextMenu
}: {
  url: string
  expired: boolean
  single: boolean
  onOpen: () => void
  onContextMenu?: () => void
}): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border-card bg-secondary-bg text-xs text-tertiary-text ${
          single ? 'h-32 w-56' : 'aspect-square'
        }`}
      >
        <ImageIcon className="h-6 w-6" />
        {expired ? 'Image expired' : "Image couldn't load"}
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      onContextMenu={onContextMenu}
      className="block cursor-zoom-in overflow-hidden rounded-lg"
    >
      <img
        src={url}
        alt="Image"
        loading="lazy"
        onError={() => setFailed(true)}
        className={single ? 'max-h-80 max-w-full object-contain' : 'aspect-square w-full object-cover'}
      />
    </button>
  )
}

export function MessageImageGrid({
  urls,
  createdAt,
  onImageContextMenu
}: {
  urls: string[]
  createdAt: number
  onImageContextMenu?: (url: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState<string | null>(null)
  const expired = Date.now() - normalizeToMs(createdAt) > MESSAGE_IMAGE_LIFETIME_MS - 60 * 60 * 1000
  return (
    <>
      <div className={`mt-1 grid max-w-md gap-1 ${urls.length === 1 ? 'grid-cols-1 justify-items-start' : 'grid-cols-2'}`}>
        {urls.map((url) => (
          <MessageImage
            key={url}
            url={url}
            expired={expired}
            single={urls.length === 1}
            onOpen={() => setOpen(url)}
            onContextMenu={() => onImageContextMenu?.(url)}
          />
        ))}
      </div>
      <ImageViewer src={open} onClose={() => setOpen(null)} />
    </>
  )
}
