const nativeFetch = window.fetch.bind(window)

export const desktopReady: Promise<void> =
  '__TAURI_INTERNALS__' in window
    ? import('./tauri').then((m) => m.install())
    : 'api' in window
      ? Promise.resolve()
      : import('./web').then((m) => m.install(nativeFetch))
