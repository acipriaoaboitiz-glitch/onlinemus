import { useEffect, useState } from 'react';
import { createRemoteSource } from '../game/remoteSource.ts';
import type { RoomSource } from '../game/types.ts';
import { useSnapshot } from '../game/useGame.ts';
import { Button } from '../components/ui.tsx';
import { useBackend } from '../lib/backendContext.tsx';
import { NAME_KEY } from '../lib/prefs.ts';
import { navigate } from '../lib/router.ts';
import { store } from '../lib/storage.ts';
import { toast } from '../lib/toast.ts';
import { Lobby } from './Lobby.tsx';
import { Table } from './Table.tsx';

function Message({ text, action }: { text: string; action?: { label: string; run: () => void } }) {
  return (
    <main className="home home--center">
      <p className="note">{text}</p>
      {action && <Button variant="primary" onClick={action.run}>{action.label}</Button>}
    </main>
  );
}

/** Una sala: según su estado se muestra el lobby o la mesa. */
export function Room({ id }: { id: string }) {
  const { backend, loading } = useBackend();
  const [source, setSource] = useState<RoomSource | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    if (!backend) return;
    let alive = true;
    let created: RoomSource | null = null;
    backend
      .ensureUser(store.get(NAME_KEY)?.trim() || 'Jugador')
      .then((me) => {
        if (!alive) return;
        created = createRemoteSource(backend, id, me);
        setSource(created);
      })
      .catch((e: unknown) => { if (alive) setFatal(e instanceof Error ? e.message : 'No se pudo conectar'); });
    return () => {
      alive = false;
      created?.destroy();
      setSource(null);
    };
  }, [backend, id]);

  if (loading) return <Message text="Conectando…" />;
  if (!backend) return <Message text="El modo online no está configurado en esta versión." action={{ label: 'Volver', run: () => navigate('/') }} />;
  if (fatal) return <Message text={fatal} action={{ label: 'Volver', run: () => navigate('/') }} />;
  if (!source) return <Message text="Conectando con la sala…" />;
  return <RoomView source={source} />;
}

function RoomView({ source }: { source: RoomSource }) {
  const snap = useSnapshot(source);
  const leave = async () => {
    const err = await source.leave();
    if (err) toast(err, 'error');
    navigate('/');
  };

  if (snap.status === 'connecting') return <Message text="Conectando con la sala…" />;
  if (snap.status === 'error') return <Message text={snap.error ?? 'No se pudo abrir la sala'} action={{ label: 'Volver al inicio', run: () => navigate('/') }} />;
  if (snap.status === 'lobby') return <Lobby source={source} onLeave={() => void leave()} />;
  return (
    <Table
      source={source}
      endAction={snap.isHost ? { label: 'Revancha', run: () => void source.rematch().then((e) => e && toast(e, 'error')) } : null}
      endNote={snap.isHost ? undefined : 'Esperando a que el anfitrión proponga la revancha'}
      onExit={() => void leave()}
    />
  );
}
