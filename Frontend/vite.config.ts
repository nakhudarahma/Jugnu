import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    // Resolved against the project root, so no Node typings are needed here.
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 5173,
    // Run `npm run dev -- --host` to reach the dev server from a tablet on the same wifi.
  },
})
