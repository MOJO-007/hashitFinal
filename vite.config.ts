import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(), // Provides browser-friendly versions of Node.js built-ins
  ],
  define: {
    'process.env': {} // Prevents errors from libraries checking process.env
  }
})