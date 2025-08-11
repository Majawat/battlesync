import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4020,
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'battlesync.me',
      '.battlesync.me','bastet'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:4019',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:4019',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
