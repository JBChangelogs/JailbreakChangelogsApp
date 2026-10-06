import { useEffect, useState } from 'react'
import { dismissToast, subscribeToasts, type ToastRecord } from '@renderer/lib/toast'
import { getInAppNotificationsEnabled } from '@renderer/lib/localPreferences'

function CloseIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

export function ToastViewport(): React.JSX.Element | null {
  const [toasts, setToasts] = useState<ToastRecord[]>([])

  useEffect(() => subscribeToasts(setToasts), [])

  if (toasts.length === 0 || !getInAppNotificationsEnabled()) return null

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[10001] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-in slide-in-from-bottom-4 fade-in pointer-events-auto flex items-start gap-3 rounded-xl border bg-secondary-bg/90 p-3 shadow-lg backdrop-blur-xl ${
            toast.accent === 'info' ? 'border-button-info/50' : 'border-border-card'
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary-text">{toast.title}</p>
            {toast.description && (
              <p className="mt-0.5 text-xs text-secondary-text">{toast.description}</p>
            )}
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.onClick()
                  dismissToast(toast.id)
                }}
                className="mt-1.5 text-xs font-semibold text-link hover:text-link-hover"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded-md p-0.5 text-tertiary-text transition-colors hover:bg-quaternary-bg hover:text-primary-text"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
