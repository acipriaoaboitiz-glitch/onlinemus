import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { loadSupabaseBackend } from './lib/supabase.ts';
import { initNative, isNative } from './lib/native.ts';
import './styles.css';

void initNative();

// Service worker: la app abre al instante y arranca sin red (el juego en sí necesita conexión salvo contra bots).
if ('serviceWorker' in navigator && import.meta.env.PROD && !isNative()) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  // Una versión nueva toma el control (skipWaiting + clients.claim): se recarga UNA vez para no quedarse con la interfaz anterior.
  // Solo desde la portada: una partida en curso no se interrumpe, la versión nueva se verá al volver a abrir.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const onHome = window.location.hash === '' || window.location.hash === '#/' || window.location.hash === '#';
    if (!hadController || reloading || !onHome) return;
    reloading = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => {
        // La app instalada puede pasar días en segundo plano: al volver a primer plano se busca una versión nueva.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void reg.update().catch(() => undefined);
        });
      })
      .catch(() => undefined);
  });
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App loadBackend={loadSupabaseBackend} />
  </StrictMode>,
);
