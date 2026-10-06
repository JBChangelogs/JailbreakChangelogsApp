# Jailbreak Changelogs Desktop

The desktop app for [Jailbreak Changelogs](https://jailbreakchangelogs.com), built with Electron, React and TypeScript ([electron-vite](https://electron-vite.org)).

## Running locally

Requirements:

- Node.js 22+ (the release script uses `process.loadEnvFile`)
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
| `npm run release:win` / `release:linux` | Clean `dist/`, build, and upload a release |

## Project layout

```
src/
  main/       Electron main process (windows, auto-update, Discord RPC, notifications, deep links)
  preload/    Bridge exposing `window.api` to the renderer
  renderer/   React app (`@renderer` alias)
  shared/     Types and data shared by main and renderer (`@shared` alias)
resources/    App icons bundled into the app
build/        Packaging assets and release scripts
```

The app talks to `api.jailbreakchangelogs.com` (the `/v2/` routes) and `inventories.jailbreakchangelogs.com`.

## Releasing

Releases are served from `https://updates.jailbreakchangelogs.com`, a Cloudflare R2 bucket. Installed apps check that feed every 30 minutes and update themselves.

- **Windows** is packaged with [Velopack](https://velopack.io) (`vpk`). Installs and updates go through Velopack's `UpdateManager`.
- **Linux** is an AppImage. Updates go through `electron-updater` using `latest-linux.yml`.
- **macOS** is a universal DMG, ad-hoc signed (no Apple Developer account), so it does not update itself (the app shows a "new version, Download" banner instead) and users must allow it once under System Settings → Privacy & Security → Open Anyway.

### One-time setup

1. Install the .NET SDK, then the Velopack CLI (Windows releases only):

   ```sh
   dotnet tool install -g vpk
   ```

2. Copy `build/.env.example` to `build/.env` and fill in the R2 credentials:

   ```
   R2_ACCOUNT_ID=
   R2_ACCESS_KEY_ID=
   R2_SECRET_ACCESS_KEY=
   R2_BUCKET=
   ```

   `build/.env` is gitignored. Already-exported environment variables work too.

### Cutting a release

1. **Bump the version** in `package.json`. The Windows package and the update feed both read it from there.

   ```sh
   npm version patch --no-git-tag-version   # or minor / major
   ```

2. **Add release notes** to the top of `APP_CHANGELOG` in `src/shared/appChangelog.ts`. They appear in the app under Settings → What's New.

   ```ts
   {
     version: '0.5.9',
     date: '2026-10-05',
     added: ['...'],
     changed: ['...'],
     fixed: ['...'],
     removed: ['...']
   },
   ```

   Every group is optional.

3. **Commit and push** the version bump and changelog entry to `main`.

4. **Run the release.** On GitHub, open Actions → **Release** → Run workflow. It builds Windows, Linux and macOS in parallel from `main`, then uploads everything to R2 in one go with `build/upload-release.mjs`. The Windows installer is uploaded as `JBCLSetup.exe`, and only the current version's full `.nupkg` is kept; older ones are deleted from the bucket.

   The workflow needs the four `R2_*` values as repository secrets (Settings → Secrets and variables → Actions).

   **Releasing locally instead:** `npm run release:win` (on Windows) and `npm run release:linux` (on Linux) still work, using `build/.env` from the one-time setup. macOS can only be built by the workflow, or on a Mac.

Download links stay the same between releases:

- Windows: https://updates.jailbreakchangelogs.com/JBCLSetup.exe
- Linux: https://updates.jailbreakchangelogs.com/JBCLSetup.AppImage
- macOS: https://updates.jailbreakchangelogs.com/JBCLSetup.dmg
