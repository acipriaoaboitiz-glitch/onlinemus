import { SIGNS, signIsTruthful } from '@mus/engine';
import type { Card, RoomConfig, SignId } from '@mus/engine';
import { AnimatePresence, motion } from 'framer-motion';
import type { IncomingSign } from '../game/types.ts';
import type { GameEvent, Seat } from '@mus/engine';
import { IconEye, IconWink } from './icons.tsx';
import { Sheet } from './ui.tsx';

const GROUPS: { id: 'cartas' | 'jugada' | 'mus'; label: string }[] = [
  { id: 'cartas', label: 'Cartas' },
  { id: 'jugada', label: 'Jugada' },
  { id: 'mus', label: 'Mus' },
];

/** Botón discreto: sin color, sin etiqueta, para no llamar la atención de quien mire por encima del hombro. */
export function SignButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="sign-btn" onClick={onClick} disabled={disabled} aria-label="Señas a tu pareja">
      <IconWink />
    </button>
  );
}

export function CatchSignalButton({ cooldownMs, disabled, windowOpen, onClick }: {
  cooldownMs: number; disabled?: boolean; windowOpen?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`catch-signal${windowOpen ? ' catch-signal--window' : ''}`}
      onClick={onClick}
      disabled={disabled || cooldownMs > 0}
      aria-label="¡Seña! Sospecho que un rival ha pasado una seña"
    >
      <IconEye />
      <span>¡Seña!</span>
      {cooldownMs > 0 && <small>{Math.ceil(cooldownMs / 1000)} s</small>}
    </button>
  );
}

export function SignalResolutionOverlay({ resolution, names }: {
  resolution: Extract<GameEvent, { t: 'signal_resolution' }> | null; names: readonly string[];
}) {
  const caught = resolution?.result === 'caught';
  const actor = resolution ? names[caught ? resolution.signalSeat ?? resolution.catcher : resolution.catcher] : '';
  return (
    <AnimatePresence>
      {resolution && (
        <motion.div
          className={`signal-alert${caught ? ' signal-alert--caught' : ' signal-alert--false'}`}
          role="alert"
          initial={{ opacity: 0, scale: 0.88, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <span>{caught ? '¡SEÑA CAZADA!' : 'FALSA ALARMA'}</span>
          <b>{caught ? `${actor} · el equipo rival gana 1 piedra` : `${actor} · su equipo pierde 1 piedra`}</b>
          <small>{caught ? 'El servidor ha confirmado la seña' : 'La sospecha llegó tarde o no había seña'}</small>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SignSheet({ open, onClose, hand, config, onSend }: {
  open: boolean; onClose: () => void; hand: Card[]; config: RoomConfig; onSend: (id: SignId) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Señas para tu pareja">
      <p className="sheet__note">El contenido es privado para tu pareja; todos ven un microdestello. {config.truthfulSigns ? 'Solo puedes hacer las señas que son ciertas con tu mano.' : 'Aquí vale el farol.'}</p>
      {GROUPS.map((g) => (
        <div key={g.id} className="signs__group">
          <h3>{g.label}</h3>
          <div className="signs__grid">
            {SIGNS.filter((s) => s.group === g.id).map((s) => {
              const ok = !config.truthfulSigns || signIsTruthful(s.id, hand, config);
              return (
                <button key={s.id} type="button" className="sign" disabled={!ok} onClick={() => { onSend(s.id); onClose(); }}>
                  <b>{s.label}</b>
                  <small>{s.gesture}</small>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </Sheet>
  );
}

/** Lo que te llega de tu pareja: solo aparece en tu pantalla. */
export function SignToast({ sign, partner }: { sign: IncomingSign | null; partner: string }) {
  if (!sign) return null;
  const def = SIGNS.find((s) => s.id === sign.id);
  if (!def) return null;
  return (
    <div className="sign-toast" key={sign.at} role="status">
      <IconWink />
      <div>
        <small>{partner} te hace una seña</small>
        <b>{def.label}</b>
        <em>{def.gesture}</em>
      </div>
    </div>
  );
}
