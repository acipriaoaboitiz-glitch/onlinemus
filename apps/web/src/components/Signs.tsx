import { SIGNS, signIsTruthful } from '@mus/engine';
import type { Card, RoomConfig, SignId } from '@mus/engine';
import type { IncomingSign } from '../game/types.ts';
import { IconWink } from './icons.tsx';
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

export function SignSheet({ open, onClose, hand, config, onSend }: {
  open: boolean; onClose: () => void; hand: Card[]; config: RoomConfig; onSend: (id: SignId) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Señas para tu pareja">
      <p className="sheet__note">Solo las ve tu pareja. {config.truthfulSigns ? 'Solo puedes hacer las señas que son ciertas con tu mano.' : 'Aquí vale el farol.'}</p>
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
