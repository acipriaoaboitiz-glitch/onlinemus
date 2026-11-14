import { useEffect, useState } from 'react';
import { createLocalSource } from '../game/localSource.ts';
import type { GameSource } from '../game/types.ts';
import { NAME_KEY, loadConfig } from '../lib/prefs.ts';
import { navigate } from '../lib/router.ts';
import { store } from '../lib/storage.ts';
import { Table } from './Table.tsx';

/** Una partida completa contra 3 bots que no necesita servidor ni cuenta. */
export function LocalGame() {
  const [round, setRound] = useState(0);
  const [source, setSource] = useState<GameSource | null>(null);

  useEffect(() => {
    const s = createLocalSource({ name: store.get(NAME_KEY)?.trim() || 'Tú', config: loadConfig() });
    setSource(s);
    return () => s.destroy();
  }, [round]);

  if (!source) return null;
  return (
    <Table
      key={round}
      source={source}
      endAction={{ label: 'Otra partida', run: () => setRound((r) => r + 1) }}
      onExit={() => navigate('/')}
    />
  );
}
