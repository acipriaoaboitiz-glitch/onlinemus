import type { Backend } from './game/backend.ts';
import { BackendProvider } from './lib/backendContext.tsx';
import { useRoute } from './lib/router.ts';
import { GameSettingsProvider } from './lib/settings.tsx';
import { Toaster } from './components/ui.tsx';
import { Home } from './pages/Home.tsx';
import { LocalGame } from './pages/LocalGame.tsx';
import { Room } from './pages/Room.tsx';

/** `loadBackend` debe ser una función estable (de módulo): en producción carga Supabase. */
export function App({ loadBackend }: { loadBackend: () => Promise<Backend | null> }) {
  const route = useRoute();
  return (
    <GameSettingsProvider>
      <BackendProvider load={loadBackend}>
        <div className="app">
          {route.name === 'home' && <Home key={route.code ?? ''} initialCode={route.code} />}
          {route.name === 'local' && <LocalGame />}
          {route.name === 'room' && <Room id={route.id} />}
          <Toaster />
          <div className="rotate-hint" role="alert">Gira el móvil: el Mus se juega en vertical</div>
        </div>
      </BackendProvider>
    </GameSettingsProvider>
  );
}
