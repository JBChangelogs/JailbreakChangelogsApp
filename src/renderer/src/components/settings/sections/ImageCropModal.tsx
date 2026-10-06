import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Button } from '@renderer/components/ui/button'
import { getCroppedImageBlob } from '@renderer/lib/cropImage'

interface ImageCropModalProps {
  title: string
  imageSrc: string
  aspect: number
  cropShape: 'round' | 'rect'
  outputWidth: number
  outputHeight: number
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}

export function ImageCropModal({
  title,
  imageSrc,
  aspect,
  cropShape,
  outputWidth,
  outputHeight,
  onCancel,
  onConfirm
}: ImageCropModalProps): React.JSX.Element {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleConfirm = async (): Promise<void> => {
    if (!croppedAreaPixels) return
    setProcessing(true)
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, outputWidth, outputHeight)
      onConfirm(blob)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative h-72 w-full shrink-0 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-3 px-5 py-4">
          <span className="text-xs text-tertiary-text">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-button-info"
          />
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-border-primary px-5 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleConfirm()}
            disabled={processing || !croppedAreaPixels}
          >
            {processing ? 'Uploading…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
