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
      <ImageViewer
        src={open?.preview ?? null}
        file={open?.file}
        onClose={() => setOpen(null)}
        gallery={attachments.map((a) => a.preview)}
        onNavigate={(src) => setOpen(attachments.find((a) => a.preview === src) ?? null)}
      />
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
  'flex h-8 w-8 items-center justify-center rounded-md text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text disabled:opacity-50'

const VIEWER_SURFACE = 'border border-border-card bg-secondary-bg shadow-lg'

function ViewerIcon({ d }: { d: string }): React.JSX.Element {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const COPY_ICON =
  'M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75'
const SAVE_ICON = 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3'
const OPEN_ICON =
  'M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25'

export function ImageViewer({
  src,
  file,
  onClose,
  canSave = true,
  gallery,
  onNavigate
}: {
  src: string | null
  file?: File
  onClose: () => void
  canSave?: boolean
  gallery?: string[]
  onNavigate?: (src: string) => void
}): React.JSX.Element {
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const remote = src?.startsWith('https://') ?? false
  const index = src && gallery ? gallery.indexOf(src) : -1
  const multiple = index >= 0 && gallery !== undefined && gallery.length > 1 && onNavigate !== undefined
  const step = (delta: number): void => {
    if (multiple) onNavigate(gallery[(index + delta + gallery.length) % gallery.length])
  }

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
      <DialogContent
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') step(-1)
          if (e.key === 'ArrowRight') step(1)
        }}
        className="inset-0 top-0 left-0 h-screen max-h-none w-screen max-w-none translate-x-0 translate-y-0 items-center justify-center rounded-none border-none bg-transparent shadow-none"
        closeClassName={`top-12 right-4 h-10 w-10 rounded-xl hover:bg-quaternary-bg ${VIEWER_SURFACE}`}
      >
        <DialogTitle className="sr-only">Image</DialogTitle>
        {src && <img src={src} alt="Image" referrerPolicy="no-referrer" className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain" />}
        {multiple && (
          <>
            {[-1, 1].map((delta) => (
              <button
                key={delta}
                type="button"
                aria-label={delta < 0 ? 'Previous image' : 'Next image'}
                onClick={() => step(delta)}
                className={`absolute top-1/2 ${delta < 0 ? 'left-4' : 'right-4'} flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-secondary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text ${VIEWER_SURFACE}`}
              >
                <ViewerIcon d={delta < 0 ? 'M15.75 19.5 8.25 12l7.5-7.5' : 'm8.25 4.5 7.5 7.5-7.5 7.5'} />
              </button>
            ))}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {gallery.map((thumb, i) => (
                <button
                  key={thumb}
                  type="button"
                  aria-label={`Image ${i + 1}`}
                  onClick={() => onNavigate(thumb)}
                  className={`h-14 w-14 overflow-hidden rounded-lg transition-opacity ${
                    i === index ? 'opacity-100' : 'opacity-40 hover:opacity-70'
                  }`}
                >
                  <img src={thumb} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </>
        )}
        {src && (canSave || remote) && (
          <div className="absolute top-12 right-16 flex flex-col items-end gap-1.5">
            <div className={`flex h-10 items-center gap-0.5 rounded-xl px-1 ${VIEWER_SURFACE}`}>
              {canSave && (
                <button
                  type="button"
                  title="Copy image"
                  aria-label="Copy image"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await copyImage(file ?? new Blob([await window.api.messageImages.bytes(src)]))
                      return 'Copied'
                    })
                  }
                  className={VIEWER_ACTION}
                >
                  <ViewerIcon d={COPY_ICON} />
                </button>
              )}
              {remote && canSave && (
                <button
                  type="button"
                  title="Save image"
                  aria-label="Save image"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await window.api.messageImages.save(src)
                      return 'Saved to Downloads'
                    })
                  }
                  className={VIEWER_ACTION}
                >
                  <ViewerIcon d={SAVE_ICON} />
                </button>
              )}
              {remote && (
                <a href={src} target="_blank" rel="noreferrer" title="Open original" aria-label="Open original" className={VIEWER_ACTION}>
                  <ViewerIcon d={OPEN_ICON} />
                </a>
              )}
            </div>
            {status && <span className={`rounded-md px-2 py-1 text-xs text-secondary-text ${VIEWER_SURFACE}`}>{status}</span>}
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
      <ImageViewer src={open} onClose={() => setOpen(null)} gallery={urls} onNavigate={setOpen} />
    </>
  )
}
