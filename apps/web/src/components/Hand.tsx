import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
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

export function Hand({ cards, interactive, selected, onSet, eightKings }: HandProps) {
  return (
    <div className={`hand${interactive ? ' hand--live' : ''}`} role="group" aria-label="Tu mano">
      {cards.map((c) => (
        <SwipeCard key={c.id} card={c} interactive={interactive} selected={selected.has(c.id)} onSet={onSet} eightKings={eightKings} />
      ))}
    </div>
  );
}

const UP = -34; // píxeles hacia arriba para marcar la carta
const DOWN = 22; // píxeles hacia abajo para desmarcarla

/** Tocar alterna la selección; deslizar hacia arriba la marca y hacia abajo la desmarca. */
function SwipeCard({ card, interactive, selected, onSet, eightKings }: {
  card: Card; interactive: boolean; selected: boolean; onSet: (id: string, on: boolean) => void; eightKings: boolean;
}) {
  const drag = useRef<{ id: number; y: number; moved: boolean } | null>(null);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);

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
  return (
    <button
      type="button"
      className={`card${selected ? ' card--selected' : ''}${dragging ? ' card--drag' : ''}`}
      style={{ transform: `translateY(${lift}px)` }}
      disabled={!interactive}
      aria-pressed={selected}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={(e) => end(e, false)}
      onPointerCancel={(e) => end(e, true)}
      onClick={(e) => { if (e.detail === 0 && interactive) onSet(card.id, !selected); }} /* teclado */
    >
      <CardFace card={card} eightKings={eightKings} />
      {selected && <span className="card__mark" aria-hidden="true">cambiar</span>}
    </button>
  );
}
