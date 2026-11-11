import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Action, LegalAction, PublicState } from '@mus/engine';
import { Button, HoldButton, Sheet } from './ui.tsx';

interface ActionBarProps {
  view: PublicState;
  legal: LegalAction[];
  busy: boolean;
  waiting: string;
  onSend: (a: Action) => void;
}

type Raise = Extract<LegalAction, { type: 'ENVIDO' }>;

/** Acciones permitidas por el motor, presentadas como controles compactos de mesa. */
export function ActionBar({ view, legal, busy, waiting, onSend }: ActionBarProps) {
  const [sheet, setSheet] = useState(false);
  const has = (t: LegalAction['type']) => legal.some((l) => l.type === t);
  const envido = legal.find((l): l is Raise => l.type === 'ENVIDO');
  const responding = view.lance?.stage === 'respond';
  const base = view.lance?.bet && view.lance.bet.total !== 'ordago' ? view.lance.bet.total : 0;

  useEffect(() => { if (!envido) setSheet(false); }, [envido]);

  if (legal.length === 0) {
    return (<div className="actions actions--idle actions--pills"><span>{waiting}</span></div>);
  }

  return (
    <>
      <motion.div
        className="actions actions--pills"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        layout
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {has('MUS') && (
          <>
            <Button variant="primary" disabled={busy} onClick={() => onSend({ type: 'MUS' })}>Mus</Button>
            <Button variant="ok" disabled={busy} onClick={() => onSend({ type: 'NO_MUS' })}>No hay mus</Button>
          </>
        )}
        {has('PASO') && <Button variant="secondary" disabled={busy} onClick={() => onSend({ type: 'PASO' })}>Paso</Button>}
        {has('QUIERO') && <Button variant="ok" disabled={busy} onClick={() => onSend({ type: 'QUIERO' })}>Quiero</Button>}
        {has('NO_QUIERO') && <Button variant="danger" disabled={busy} onClick={() => onSend({ type: 'NO_QUIERO' })}>No quiero</Button>}
        {envido && (
          <Button variant="primary" disabled={busy} onClick={() => setSheet(true)}>
            {responding ? 'Subir…' : 'Envido…'}
          </Button>
        )}
        {has('ORDAGO') && (
          <HoldButton disabled={busy} className={responding ? '' : 'span-2'} onConfirm={() => onSend({ type: 'ORDAGO' })}>
            ¡Órdago!
          </HoldButton>
        )}
      </motion.div>
      {envido && (
        <BetSheet
          open={sheet}
          raise={Boolean(responding)}
          min={envido.min}
          max={envido.max}
          base={base}
          onClose={() => setSheet(false)}
          onConfirm={(amount) => { setSheet(false); onSend({ type: 'ENVIDO', amount }); }}
        />
      )}
    </>
  );
}

function BetSheet({ open, raise, min, max, base, onClose, onConfirm }: {
  open: boolean; raise: boolean; min: number; max: number; base: number; onClose: () => void; onConfirm: (n: number) => void;
}) {
  const [value, setValue] = useState(min);
  useEffect(() => { if (open) setValue(min); }, [open, min]);
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const chips = (raise ? [2, 3, 5, 8, 10] : [2, 3, 4, 5, 8, 10, 15]).filter((v) => v >= min && v <= max);
  return (
    <Sheet open={open} onClose={onClose} title={raise ? 'Subir el envite' : 'Envidar'}>
      <div className="bet">
        <button type="button" className="bet__step" aria-label="Menos" onClick={() => setValue(clamp(value - 1))}>−</button>
        <div className="bet__value">
          <b>{value}</b>
          <small>{raise ? `más · ${base + value} en juego` : value === 1 ? 'piedra' : 'piedras'}</small>
        </div>
        <button type="button" className="bet__step" aria-label="Más" onClick={() => setValue(clamp(value + 1))}>+</button>
      </div>
      <div className="bet__chips">
        {chips.map((v) => (
          <button key={v} type="button" className={`chip${v === value ? ' on' : ''}`} onClick={() => setValue(v)}>
            {raise ? `+${v}` : v}
          </button>
        ))}
      </div>
      <Button variant="primary" block onClick={() => onConfirm(value)}>
        {raise ? `Subo ${value} más` : `Envido ${value}`}
      </Button>
    </Sheet>
  );
}
