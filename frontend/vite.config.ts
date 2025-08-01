import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuration constants
const FRONTEND_PORT = 3000;
const BACKEND_TARGET = 'http://app:3001';
const WEBSOCKET_TARGET = 'ws://app:3001';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: FRONTEND_PORT,
    allowedHosts: ['bastet', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: WEBSOCKET_TARGET,
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})