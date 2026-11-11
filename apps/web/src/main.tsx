import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { loadSupabaseBackend } from './lib/supabase.ts';
import { initNative, isNative } from './lib/native.ts';
import './styles.css';

void initNative();

// Service worker: la app abre al instante y arranca sin red (el juego en sí necesita conexión salvo contra bots).
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App loadBackend={loadSupabaseBackend} />
  </StrictMode>,
);
