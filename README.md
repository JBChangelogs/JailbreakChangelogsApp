# Jailbreak Changelogs Desktop

The desktop app for [Jailbreak Changelogs](https://jailbreakchangelogs.com), built with [Tauri v2](https://v2.tauri.app), React and TypeScript.

## Running locally

Requirements:

- Node.js 22+ and npm
- Rust (stable) and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS

```sh
npm install
npm run dev
```

`npm run dev` starts the app with hot reload for the React app; Rust changes rebuild and restart it automatically.

| Script | What it does |
| --- | --- |
| `npm run dev` | Run the app in development mode |
| `npm run typecheck` | Type-check the React app and the build scripts |
| `npm run build` | Typecheck, then build an installer for this OS into `src-tauri/target/release/bundle/` |

## Project layout

```
src-tauri/    Rust app (windows, updates, Discord RPC, notifications, deep links, trade scanner)
src/
  renderer/   React app (`@renderer` alias)
  shared/     Types and data shared with the React app (`@shared` alias)
resources/    OCR models for the trade scanner, downloaded by the app on first use
build/        Release and packaging scripts
preview/      Browser preview of the app with mocked data
```

The app talks to `api.jailbreakchangelogs.com` (the `/v2/` routes) and `inventories.jailbreakchangelogs.com`.

## Download

- Windows: https://updates.jailbreakchangelogs.com/JBCLSetup.exe
- Linux: https://updates.jailbreakchangelogs.com/JBCLSetup.AppImage
- macOS: https://updates.jailbreakchangelogs.com/JBCLSetup.dmg
