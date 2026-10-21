import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages serves this repository under /CloudPulse/; local development stays at /.
  base: process.env.GITHUB_ACTIONS === 'true' ? '/CloudPulse/' : '/',
  plugins: [react()],
  server: {
    // Bind to loopback and fail loudly if the documented port is occupied.
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
