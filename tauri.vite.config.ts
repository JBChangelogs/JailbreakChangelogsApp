import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: resolve('src/renderer'),
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared')
    }
  },
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: { port: 5173, strictPort: true },
  build: {
    outDir: resolve('out/tauri'),
    emptyOutDir: true,
    target: ['es2021', 'safari16'],
    rollupOptions: {
      input: {
        index: resolve('src/renderer/index.html'),
        picker: resolve('src/renderer/picker.html')
      }
    }
  }
})
