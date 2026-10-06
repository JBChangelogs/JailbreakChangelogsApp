# Jailbreak Changelogs Desktop

The desktop app for [Jailbreak Changelogs](https://jailbreakchangelogs.com), built with Electron, React and TypeScript ([electron-vite](https://electron-vite.org)).

## Running locally

Requirements:

- Node.js 22+
- npm

```sh
npm install
npm run dev
```

`npm run dev` starts the app with hot reload for the renderer. After changing `src/main` or `src/preload`, restart it.

| Script | What it does |
| --- | --- |
| `npm run dev` | Run the app in development mode |
| `npm run typecheck` | Type-check the main/preload and renderer projects |
| `npm run build` | Typecheck, then compile everything into `out/` |
| `npm start` | Run the compiled app from `out/` |
| `npm run build:win` / `build:linux` / `build:mac` | Build a packaged app into `dist/` |

## Project layout

```
src/
  main/       Electron main process (windows, auto-update, Discord RPC, notifications, deep links)
  preload/    Bridge exposing `window.api` to the renderer
  renderer/   React app (`@renderer` alias)
  shared/     Types and data shared by main and renderer (`@shared` alias)
resources/    App icons bundled into the app
build/        Packaging assets and scripts
```

The app talks to `api.jailbreakchangelogs.com` (the `/v2/` routes) and `inventories.jailbreakchangelogs.com`.

## Download

- Windows: https://updates.jailbreakchangelogs.com/JBCLSetup.exe
- Linux: https://updates.jailbreakchangelogs.com/JBCLSetup.AppImage
- macOS: https://updates.jailbreakchangelogs.com/JBCLSetup.dmg
