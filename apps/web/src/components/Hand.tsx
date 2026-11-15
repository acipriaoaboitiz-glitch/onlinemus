import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '@mus/engine';
import { haptic } from '../lib/feedback.ts';
import { CardFace } from './CardFace.tsx';

interface HandProps {
  cards: Card[];
  interactive: boolean;
  selected: ReadonlySet<string>;
  onSet: (id: string, on: boolean) => void;
  eightKings: boolean;
}

/**
 * Tu mano. El ancho de carta sale de `--card-w` (definida en la mesa con min(vw, dvh)): así las cuatro cartas
 * caben siempre, en vertical y en apaisado, sin hacer scroll. Las cartas se reparten una a una, sin prisa.
 */
export function Hand({ cards, interactive, selected, onSet, eightKings }: HandProps) {
  return (
    <div className="flex items-end justify-center gap-[min(2vw,12px)] pt-[min(3.4dvh,26px)]" role="group" aria-label="Tu mano">
      {cards.map((c, i) => (
        <SwipeCard key={c.id} index={i} card={c} interactive={interactive} selected={selected.has(c.id)} onSet={onSet} eightKings={eightKings} />
      ))}
    </div>
  );
}

const UP = -34; // píxeles hacia arriba para marcar la carta
const DOWN = 22; // píxeles hacia abajo para desmarcarla

/** Tocar alterna la selección; deslizar hacia arriba la marca y hacia abajo la desmarca. */
function SwipeCard({ card, index, interactive, selected, onSet, eightKings }: {
  card: Card; index: number; interactive: boolean; selected: boolean; onSet: (id: string, on: boolean) => void; eightKings: boolean;
}) {
  const drag = useRef<{ id: number; y: number; moved: boolean } | null>(null);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dealt, setDealt] = useState(false);

  const down = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, y: e.clientY, moved: false };
    setDragging(true);
  };
  const move = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const delta = e.clientY - d.y;
    if (Math.abs(delta) > 6) d.moved = true;
    setDy(Math.max(-96, Math.min(48, delta)));
  };
  const end = (e: ReactPointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    setDy(0);
    if (cancelled) return;
    const delta = e.clientY - d.y;
    if (!d.moved) { onSet(card.id, !selected); haptic(8); return; }
    if (delta <= UP && !selected) { onSet(card.id, true); haptic(12); }
    else if (delta >= DOWN && selected) { onSet(card.id, false); haptic(8); }
  };

  const lift = (selected ? -20 : 0) + dy;
  const tilt = (index - 1.5) * 1.8;
  return (
    <motion.button
      type="button"
      className="relative block aspect-[12/19] w-[var(--card-w)] touch-none rounded-[10px] shadow-[0_10px_20px_rgba(0,0,0,.4),0_2px_3px_rgba(0,0,0,.25)] enabled:cursor-grab disabled:cursor-default"
      style={selected ? { boxShadow: '0 0 0 2px #f0c35f, 0 12px 24px rgba(226,180,85,.3)' } : undefined}
      initial={{ opacity: 0, y: -90, scale: 0.85, rotate: tilt - 8 }}
      animate={{ opacity: 1, y: lift, scale: 1, rotate: tilt }}
      transition={
        dragging
          ? { duration: 0 }
          : dealt
            ? { type: 'spring', stiffness: 380, damping: 28 }
            : { type: 'spring', stiffness: 130, damping: 17, delay: 0.25 + index * 0.16 }
      }
      onAnimationComplete={() => setDealt(true)}
      whileHover={interactive && !dragging ? { y: lift - 6 } : undefined}
      disabled={!interactive}
      aria-pressed={selected}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={(e) => end(e, false)}
      onPointerCancel={(e) => end(e, true)}
      onClick={(e) => { if (e.detail === 0 && interactive) onSet(card.id, !selected); }} /* teclado */
    >
      <CardFace card={card} eightKings={eightKings} />
      {selected && (
        <motion.span
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 px-2 py-[2px] text-[9px] font-extrabold uppercase tracking-wide text-amber-950"
          aria-hidden="true"
        >
          cambiar
        </motion.span>
      )}
    </motion.button>
  );
}
