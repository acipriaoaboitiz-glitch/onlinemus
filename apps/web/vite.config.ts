import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: la misma build sirve en un dominio, en una subcarpeta y dentro de la app nativa.
  base: './',
  plugins: [react()],
  resolve: {
    // El motor se importa directamente desde su código fuente (también funciona sin workspaces).
    alias: { '@mus/engine': fileURLToPath(new URL('../../packages/engine/src/index.ts', import.meta.url)) },
  },
  server: { host: true, port: 5173 },
});
