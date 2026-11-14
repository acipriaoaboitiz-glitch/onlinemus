import { useState } from 'react';
import type { RoomConfig, Seat } from '@mus/engine';
import { ConfigForm, configSummary } from '../components/ConfigForm.tsx';
import { IconBot, IconCopy, IconCrown, IconExit, IconPlus, IconShare } from '../components/icons.tsx';
import { Avatar, Button, Sheet } from '../components/ui.tsx';
import type { RoomSource, SeatInfo } from '../game/types.ts';
import { useSnapshot } from '../game/useGame.ts';
import { toast } from '../lib/toast.ts';

/** Sala de espera: código para compartir, cuatro asientos en dos parejas y ajustes de la partida. */
export function Lobby({ source, onLeave }: { source: RoomSource; onLeave: () => void }) {
  const snap = useSnapshot(source);
  const room = snap.room;
  const [cfgOpen, setCfgOpen] = useState(false);
  const [draft, setDraft] = useState<RoomConfig | null>(null);
  const [busy, setBusy] = useState(false);
  if (!room) return null;

  const full = snap.seats.every((s) => s.name !== null);
  const code = room.code;
  const pretty = code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
  // En la app nativa el origen es capacitor://localhost: para invitar hace falta la URL pública de la web (VITE_PUBLIC_URL).
  const publicBase = (import.meta.env.VITE_PUBLIC_URL as string | undefined) || `${window.location.origin}${window.location.pathname}`;
  const link = `${publicBase.replace(/#.*$/, '')}#/join/${code}`;

  const run = async (fn: () => Promise<string | null>) => {
    const err = await fn();
    if (err) toast(err, 'error');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); toast('Código copiado', 'ok', 1500); } catch { toast(`Código: ${code}`); }
  };
  const share = async () => {
    const data = { title: 'Mus online', text: `Entra a mi sala de Mus con el código ${code}`, url: link };
    if (typeof navigator.share === 'function') {
      try { await navigator.share(data); } catch { /* cancelado por el usuario */ }
    } else {
      try { await navigator.clipboard.writeText(link); toast('Enlace copiado', 'ok', 1500); } catch { toast(link); }
    }
  };
  const start = async () => {
    setBusy(true);
    await run(() => source.start());
    setBusy(false);
  };

  const slot = (seat: Seat) => (
    <Slot
      key={seat}
      info={snap.seats[seat]}
      mine={snap.mySeat === seat}
      host={snap.seats[seat].userId !== null && snap.seats[seat].userId === room.hostId}
      iAmHost={snap.isHost}
      onSit={() => void run(() => source.chooseSeat(seat))}
      onAddBot={() => void run(() => source.addBot(seat))}
      onRemoveBot={() => void run(() => source.removeBot(seat))}
    />
  );

  return (
    <main className="lobby">
      <header className="lobby__top">
        <button type="button" className="icon-btn" aria-label="Salir de la sala" onClick={onLeave}><IconExit /></button>
        <h1>Sala de espera</h1>
        <span className="lobby__spacer" />
      </header>

      <section className="codecard">
        <small>Código de la sala</small>
        <div className="codecard__code" aria-label={`Código ${code}`}>{pretty}</div>
        <div className="codecard__actions">
          <Button onClick={() => void copy()}><IconCopy /> Copiar</Button>
          <Button onClick={() => void share()}><IconShare /> Compartir</Button>
        </div>
      </section>

      <section className="teams">
        <div className="team team--a">
          <h2>Pareja A</h2>
          {slot(0)}
          {slot(2)}
        </div>
        <div className="team team--b">
          <h2>Pareja B</h2>
          {slot(1)}
          {slot(3)}
        </div>
      </section>
      <p className="lobby__tip">Los compañeros se sientan enfrente. Toca un asiento libre para cambiarte.</p>

      <button
        type="button"
        className="cfgline"
        disabled={!snap.isHost}
        onClick={() => { setDraft(room.config); setCfgOpen(true); }}
      >
        <span>{configSummary(room.config)}</span>
        {snap.isHost && <b>Editar</b>}
      </button>

      <footer className="lobby__foot">
        {snap.isHost ? (
          <Button variant="primary" block disabled={!full || busy} onClick={() => void start()}>
            {full ? (busy ? 'Empezando…' : 'Empezar partida') : `Faltan ${snap.seats.filter((s) => s.name === null).length} jugadores`}
          </Button>
        ) : (
          <p className="lobby__wait">Esperando a que el anfitrión empiece la partida…</p>
        )}
      </footer>

      <Sheet open={cfgOpen} onClose={() => setCfgOpen(false)} title="Ajustes de partida">
        {draft && <ConfigForm value={draft} onChange={setDraft} />}
        <Button
          variant="primary"
          block
          onClick={() => {
            if (draft) void run(() => source.setConfig(draft));
            setCfgOpen(false);
          }}
        >
          Guardar
        </Button>
      </Sheet>
    </main>
  );
}

function Slot({ info, mine, host, iAmHost, onSit, onAddBot, onRemoveBot }: {
  info: SeatInfo; mine: boolean; host: boolean; iAmHost: boolean; onSit: () => void; onAddBot: () => void; onRemoveBot: () => void;
}) {
  if (info.name === null) {
    return (
      <div className="slot slot--empty">
        <span className="slot__ghost"><IconPlus /></span>
        <span className="slot__text"><b>Libre</b></span>
        <span className="slot__actions">
          <Button variant="ghost" onClick={onSit}>Sentarme</Button>
          {iAmHost && <Button variant="ghost" onClick={onAddBot}><IconBot /> Bot</Button>}
        </span>
      </div>
    );
  }
  return (
    <div className={`slot${mine ? ' slot--mine' : ''}`}>
      {info.isBot ? <span className="slot__ghost slot__ghost--bot"><IconBot /></span> : <Avatar name={info.name} tone={mine ? 'me' : 'neutral'} size={40} />}
      <span className="slot__text">
        <b>{mine ? `${info.name} (tú)` : info.name}</b>
        <small>
          {host && <><IconCrown /> anfitrión · </>}
          {info.isBot ? 'bot' : info.online ? 'conectado' : 'sin conexión'}
        </small>
      </span>
      {info.isBot && iAmHost && <span className="slot__actions"><Button variant="ghost" onClick={onRemoveBot}>Quitar</Button></span>}
    </div>
  );
}
