import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    allowedHosts: ['bastet', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'http://app:3001',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'http://app:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})