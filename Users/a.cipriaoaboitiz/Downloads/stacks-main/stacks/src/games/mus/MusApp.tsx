import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './app/mus.css';
import { Toaster } from './app/components/ui.tsx';
import { createLocalSource } from './app/game/localSource.ts';
import type { GameSource } from './app/game/types.ts';
import { GameSettingsProvider } from './app/lib/settings.tsx';
import { Table } from './app/pages/Table.tsx';
import { aiDelay } from '../../store/settings.ts';
import { useWallet } from '../../store/wallet.ts';
import { exitMatch } from '../../services/exitMatch.ts';

/**
 * Mesa de Mus de Mus Online (React + Tailwind + Framer Motion), tal cual su juego: mismo motor, bots, señas,
 * cartel de lances, recuento y ajustes. Los estilos van con ámbito `.musapp` para no mezclarse con STACKS.
 */
export default function MusApp({ roomCode }: { roomCode?: string }) {
  const nav = useNavigate();
  const { name } = useWallet();
  const [round, setRound] = useState(0);
  const [source, setSource] = useState<GameSource | null>(null);

  useEffect(() => {
    const s = createLocalSource({ name: name || 'Tú', config: { turnSeconds: 15 }, botDelay: [aiDelay(750), aiDelay(900)] });
    setSource(s);
    return () => s.destroy();
    // La partida se recrea solo al pedir otra (round); cambiar el nombre no debe reiniciarla.
    // eslint-disable-next-line
  }, [round]);

  if (!source) return null;
  return (
    <GameSettingsProvider>
      <div className="musapp" data-room={roomCode}>
        <div className="app">
          <Table
            key={round}
            source={source}
            endAction={{ label: 'Otra partida', run: () => setRound((r) => r + 1) }}
            onExit={() => void exitMatch(nav)}
          />
          <Toaster />
        </div>
      </div>
    </GameSettingsProvider>
  );
}
