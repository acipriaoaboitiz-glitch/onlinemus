import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Action, LegalAction, PublicState } from '@mus/engine';
import { playSound } from '../lib/sounds.ts';
import { Button, Sheet } from './ui.tsx';

interface ActionBarProps {
  view: PublicState;
  legal: LegalAction[];
  busy: boolean;
  waiting: string;
  onSend: (a: Action) => void;
}

type Raise = Extract<LegalAction, { type: 'ENVIDO' }>;

const PILL =
  'relative inline-flex h-10 items-center justify-center gap-1 overflow-hidden rounded-full border px-[min(4vw,18px)] text-[13px] font-bold tracking-wide shadow-[0_5px_16px_rgba(0,0,0,.25),inset_0_1px_rgba(255,255,255,.12)] transition-transform duration-100 enabled:active:scale-95 disabled:opacity-40';
const TONE = {
  gold: 'border-amber-200 bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950',
  ok: 'border-emerald-400/60 bg-emerald-800 text-emerald-50',
  danger: 'border-red-400/60 bg-red-950 text-red-50',
  soft: 'border-amber-300/55 bg-gradient-to-br from-amber-300/20 to-zinc-800 text-amber-100',
} as const;

function Pill({ tone, children, onClick, disabled, label }: { tone: keyof typeof TONE; children: ReactNode; onClick: () => void; disabled: boolean; label?: string }) {
  return (
    <motion.button
      type="button"
      layout
      className={`${PILL} ${TONE[tone]}`}
      disabled={disabled}
      aria-label={label}
      onClick={() => { playSound('click'); onClick(); }}
    >
      {children}
    </motion.button>
  );
}

/** Órdago: hay que mantenerlo pulsado (650 ms) para que no se cante sin querer. El relleno avanza con Framer Motion. */
function OrdagoButton({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const HOLD = 650;
  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);
  const start = () => {
    if (disabled) return;
    setHolding(true);
    timer.current = setTimeout(() => { timer.current = null; setHolding(false); onConfirm(); }, HOLD);
  };
  return (
    <motion.button
      type="button"
      layout
      disabled={disabled}
      className={`${PILL} select-none flex-col gap-0 border-rose-500 bg-rose-950 px-[min(4vw,18px)] leading-none text-white`}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onClick={(e) => { if (e.detail === 0 && !disabled) onConfirm(); }} /* pulsación con teclado */
      onContextMenu={(e) => e.preventDefault()}
    >
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 origin-left bg-gradient-to-r from-rose-500 to-orange-500"
        initial={false}
        animate={{ scaleX: holding ? 1 : 0 }}
        transition={{ duration: holding ? HOLD / 1000 : 0.15, ease: 'linear' }}
      />
      <span className="relative text-[13px]">¡Órdago!</span>
      <span className="relative text-[7px] font-semibold uppercase tracking-[.12em] opacity-70">{holding ? 'sigue…' : 'mantén'}</span>
    </motion.button>
  );
}

/** Acciones que permite el motor, como una píldora flotante. Entra con fundido tras cada cartel de fase. */
export function ActionBar({ view, legal, busy, waiting, onSend }: ActionBarProps) {
  const [sheet, setSheet] = useState(false);
  const has = (t: LegalAction['type']) => legal.some((l) => l.type === t);
  const envido = legal.find((l): l is Raise => l.type === 'ENVIDO');
  const responding = view.lance?.stage === 'respond';
  const base = view.lance?.bet && view.lance.bet.total !== 'ordago' ? view.lance.bet.total : 0;

  useEffect(() => { if (!envido) setSheet(false); }, [envido]);

  return (
    <div className="flex min-h-[50px] items-center justify-center">
      <AnimatePresence mode="wait">
        {legal.length === 0 ? (
          <motion.div
            key="idle"
            className="rounded-full border border-white/10 bg-zinc-900/60 px-4 py-2 text-[12px] text-stone-400"
            initial={{ opacity: 0 }} animate={{ opacity: waiting ? 1 : 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {waiting || '\u00a0'}
          </motion.div>
        ) : (
          <motion.div
            key="actions"
            className="flex max-w-full flex-wrap items-center justify-center gap-[5px] rounded-[26px] border border-white/10 bg-zinc-900/75 p-[5px] shadow-[0_8px_24px_rgba(0,0,0,.28)] backdrop-blur-md"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: 'easeOut' } }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
          >
            {has('MUS') && (<>
              <Pill tone="gold" disabled={busy} onClick={() => onSend({ type: 'MUS' })}>Mus</Pill>
              <Pill tone="ok" disabled={busy} onClick={() => onSend({ type: 'NO_MUS' })}>No hay mus</Pill>
            </>)}
            {has('QUIERO') && <Pill tone="ok" disabled={busy} onClick={() => onSend({ type: 'QUIERO' })}>Quiero</Pill>}
            {has('NO_QUIERO') && <Pill tone="danger" disabled={busy} onClick={() => onSend({ type: 'NO_QUIERO' })}>No quiero</Pill>}
            {envido && <Pill tone="gold" disabled={busy} onClick={() => setSheet(true)}>{responding ? 'Subir…' : 'Envido…'}</Pill>}
            {has('ORDAGO') && <OrdagoButton disabled={busy} onConfirm={() => onSend({ type: 'ORDAGO' })} />}
            {has('PASO') && (
              <Pill tone="soft" disabled={busy} label="Paso: pasar en este lance" onClick={() => onSend({ type: 'PASO' })}>
                Paso <span aria-hidden="true">↗</span>
              </Pill>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
    </div>
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
