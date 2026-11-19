import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// base './' → funciona en hosting estático y dentro de Capacitor (file/https://localhost).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    // El motor de Mus de Mus Online vive en src/vendor/mus-engine.
    alias: { '@mus/engine': fileURLToPath(new URL('./src/vendor/mus-engine/index.ts', import.meta.url)) },
  },
})
