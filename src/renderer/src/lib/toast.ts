import { getDesktopNotificationsEnabled } from './localPreferences'
export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  description?: string
  action?: ToastAction
  durationMs?: number
  accent?: 'default' | 'info'
}

export interface ToastRecord extends ToastOptions {
  id: string
  title: string
}

const DEFAULT_DURATION_MS = 6000
const MAX_TOASTS = 4

let toasts: ToastRecord[] = []
const listeners = new Set<(toasts: ToastRecord[]) => void>()
const timeouts = new Map<string, ReturnType<typeof setTimeout>>()

function emit(): void {
  for (const listener of listeners) listener(toasts)
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id)
  const timeout = timeouts.get(id)
  if (timeout) {
    clearTimeout(timeout)
    timeouts.delete(id)
  }
  emit()
}

export function showToast(title: string, options: ToastOptions = {}): string {
  const id = crypto.randomUUID()
  toasts = [...toasts.slice(-(MAX_TOASTS - 1)), { id, title, ...options }]
  emit()
  timeouts.set(
    id,
    setTimeout(() => dismissToast(id), options.durationMs ?? DEFAULT_DURATION_MS)
  )

  if (!document.hasFocus() && getDesktopNotificationsEnabled()) {
    void window.api.notifications.show({ id, title, body: options.description })
  }

  return id
}

export function triggerToastAction(id: string): void {
  const toast = toasts.find((t) => t.id === id)
  toast?.action?.onClick()
  dismissToast(id)
}

export function subscribeToasts(listener: (toasts: ToastRecord[]) => void): () => void {
  listeners.add(listener)
  listener(toasts)
  return () => {
    listeners.delete(listener)
  }
}
