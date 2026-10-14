import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const dir = fileURLToPath(new URL('.', import.meta.url))
const repo = resolve(dir, '..')

// Builds the real renderer (same aliases and plugins as electron.vite.config.ts) with the
// desktop bridge, API and sockets mocked, plus the showcase page that tours it.
export default defineConfig({
  // Repo root, so Tailwind scans src/ for classes like the app build does. Pages land in dist/preview/.
  root: repo,
  // Served from the root of the custom domain, so pages can move to the top of dist/ without breaking asset URLs.
  base: '/',
  resolve: {
    alias: {
      '@renderer': resolve(repo, 'src/renderer/src'),
      '@shared': resolve(repo, 'src/shared')
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'pages-at-root',
      enforce: 'post',
      generateBundle(_, bundle) {
        for (const file of Object.values(bundle)) file.fileName = file.fileName.replace(/^preview\//, '')
      }
    }
  ],
  build: {
    outDir: resolve(dir, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(dir, 'index.html'),
        app: resolve(dir, 'app.html')
      }
    }
  }
})
