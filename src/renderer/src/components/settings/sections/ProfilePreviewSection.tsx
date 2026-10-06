import { useEffect, useRef, useState } from 'react'
import { useCurrentUser } from '@renderer/hooks/useCurrentUser'
import { useProfileImageUpload } from '@renderer/hooks/useProfileImageUpload'
import { uploadAvatar, getCustomAvatar } from '@renderer/lib/avatarApi'
import { uploadBanner, getCustomBanner } from '@renderer/lib/bannerApi'
import { Switch } from '@renderer/components/ui/switch'
import { ImageCropModal } from './ImageCropModal'

const MIN_SUPPORTER_TIER = 2
const AVATAR_SIZE = 512
const BANNER_WIDTH = 1500
const BANNER_HEIGHT = 500

function CameraIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"
      />
      <circle cx="12" cy="13" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function readFile(input: HTMLInputElement, onFile: (file: File) => void): void {
  const file = input.files?.[0]
  input.value = ''
  if (file) onFile(file)
}

export function ProfilePreviewSection(): React.JSX.Element {
  const { user } = useCurrentUser()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [previewAvatar, setPreviewAvatar] = useState(false)
  const [previewBanner, setPreviewBanner] = useState(false)

  const avatar = useProfileImageUpload('custom_avatar', uploadAvatar, getCustomAvatar)
  const banner = useProfileImageUpload('custom_banner', uploadBanner, getCustomBanner)

  useEffect(() => {
    if (avatar.enabled) setPreviewAvatar(false)
  }, [avatar.enabled])
  useEffect(() => {
    if (banner.enabled) setPreviewBanner(false)
  }, [banner.enabled])

  const supporterTier = user?.supporter ?? 0
  const hasAccess = supporterTier >= MIN_SUPPORTER_TIER

  const canPreviewAvatar = !!avatar.customValue && !avatar.enabled
  const canPreviewBanner = !!banner.customValue && !banner.enabled
  const showingCustomAvatar = previewAvatar && canPreviewAvatar
  const showingCustomBanner = previewBanner && canPreviewBanner

  const avatarPreviewSrc = (showingCustomAvatar ? avatar.customValue : user?.avatar) || null
  const bannerPreviewSrc = (showingCustomBanner ? banner.customValue : user?.banner) || null
  const errorMessage = avatar.error || banner.error

  return (
    <div className="mb-4">
      <div className="overflow-hidden rounded-xl border border-border-card bg-secondary-bg">
        <button
          type="button"
          disabled={!hasAccess || banner.uploading}
          onClick={() => bannerInputRef.current?.click()}
          className="group relative block h-32 w-full bg-tertiary-bg disabled:cursor-not-allowed"
        >
          {bannerPreviewSrc && <img src={bannerPreviewSrc} alt="" className="h-full w-full object-cover" />}
          {hasAccess && (
            <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/0 text-xs font-semibold text-white opacity-0 transition-all duration-150 group-hover:bg-black/50 group-hover:opacity-100">
              <CameraIcon className="h-4 w-4" />
              {banner.uploading ? 'Uploading…' : 'Change banner'}
            </div>
          )}
          {showingCustomBanner && (
            <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
              Previewing
            </span>
          )}
        </button>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => readFile(e.currentTarget, banner.selectFile)}
        />

        <div className="px-4 pb-4">
          <div className="flex items-end gap-3">
            <button
              type="button"
              disabled={!hasAccess || avatar.uploading}
              onClick={() => avatarInputRef.current?.click()}
              className="group relative -mt-10 block h-20 w-20 shrink-0 rounded-full border-4 border-secondary-bg bg-tertiary-bg disabled:cursor-not-allowed"
            >
              {avatarPreviewSrc && (
                <img src={avatarPreviewSrc} alt="" className="h-full w-full rounded-full object-cover" />
              )}
              {hasAccess && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/50 group-hover:opacity-100">
                  <CameraIcon className="h-5 w-5 text-white" />
                </div>
              )}
              {showingCustomAvatar && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap text-white">
                  Previewing
                </span>
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => readFile(e.currentTarget, avatar.selectFile)}
            />
            <div className="min-w-0 flex-1 pb-1">
              <p className="truncate text-sm font-semibold text-primary-text">{user?.username ?? 'Your profile'}</p>
              <p className="text-xs text-tertiary-text">
                {hasAccess ? 'Click your avatar or banner to change them' : 'Requires Supporter Tier 2 or higher'}
              </p>
            </div>
          </div>

          {errorMessage && <p className="mt-2 text-xs text-form-error">{errorMessage}</p>}

          <div className="mt-3 space-y-0.5 border-t border-border-primary pt-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-1 py-2 transition-colors hover:bg-secondary-bg">
              <span className="text-sm text-primary-text">Use custom avatar</span>
              <div className="flex items-center gap-3">
                {canPreviewAvatar && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setPreviewAvatar((prev) => !prev)
                    }}
                    className="text-xs font-semibold text-link hover:text-link-hover"
                  >
                    {previewAvatar ? 'Hide preview' : 'Preview'}
                  </button>
                )}
                <Switch
                  checked={!!avatar.enabled}
                  disabled={!hasAccess || avatar.togglePending}
                  onCheckedChange={(checked) => void avatar.toggle(checked)}
                />
              </div>
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-1 py-2 transition-colors hover:bg-secondary-bg">
              <span className="text-sm text-primary-text">Use custom banner</span>
              <div className="flex items-center gap-3">
                {canPreviewBanner && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setPreviewBanner((prev) => !prev)
                    }}
                    className="text-xs font-semibold text-link hover:text-link-hover"
                  >
                    {previewBanner ? 'Hide preview' : 'Preview'}
                  </button>
                )}
                <Switch
                  checked={!!banner.enabled}
                  disabled={!hasAccess || banner.togglePending}
                  onCheckedChange={(checked) => void banner.toggle(checked)}
                />
              </div>
            </label>
          </div>
        </div>
      </div>

      {avatar.pendingImageSrc && (
        <ImageCropModal
          title="Crop your avatar"
          imageSrc={avatar.pendingImageSrc}
          aspect={1}
          cropShape="round"
          outputWidth={AVATAR_SIZE}
          outputHeight={AVATAR_SIZE}
          onCancel={avatar.closeCropModal}
          onConfirm={(blob) => void avatar.confirmCrop(blob)}
        />
      )}
      {banner.pendingImageSrc && (
        <ImageCropModal
          title="Crop your banner"
          imageSrc={banner.pendingImageSrc}
          aspect={3}
          cropShape="rect"
          outputWidth={BANNER_WIDTH}
          outputHeight={BANNER_HEIGHT}
          onCancel={banner.closeCropModal}
          onConfirm={(blob) => void banner.confirmCrop(blob)}
        />
      )}
    </div>
  )
}
