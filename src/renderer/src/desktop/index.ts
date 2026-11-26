const nativeFetch = window.fetch.bind(window)

if (window.parent !== window && !('__TAURI_INTERNALS__' in window)) {
  try {
    const internals = (window.parent as unknown as Record<string, unknown>).__TAURI_INTERNALS__
    if (internals) Object.assign(window, { __TAURI_INTERNALS__: internals })
  } catch {
    // A cross-origin parent: run as the web app.
  }
}

export const desktopReady: Promise<void> =
  '__TAURI_INTERNALS__' in window
    ? import('./tauri').then((m) => m.install())
    : 'api' in window
      ? Promise.resolve()
      : import('./web').then((m) => m.install(nativeFetch))
