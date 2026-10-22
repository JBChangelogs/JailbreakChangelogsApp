export const desktopReady: Promise<void> =
  '__TAURI_INTERNALS__' in window ? import('./tauri').then((m) => m.install()) : Promise.resolve()
