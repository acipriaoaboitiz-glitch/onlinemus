import { useEffect, useRef, useState } from 'react';

export const TURN_SECONDS = 15;

export interface TurnTimerSpec {
  /** Hay un turno humano en curso. */
  active: boolean;
  /** Cambia con cada turno/acción para reiniciar la cuenta. */
  id: string | number;
  /** Se llama al llegar a 0 s: debe jugar una acción válida automática (pasar, tirar carta…). */
  onTimeout: () => void;
}

/**
 * Barra de cuenta atrás de 15 s. La barra se anima con CSS (`transform: scaleX`, en GPU) y solo el número
 * se actualiza una vez por segundo dentro de este subcomponente: el tablero y las cartas no se vuelven a pintar.
 */
export function TurnTimerBar({ spec }: { spec: TurnTimerSpec }) {
  const [left, setLeft] = useState(TURN_SECONDS);
  const cb = useRef(spec.onTimeout);
  cb.current = spec.onTimeout;

  useEffect(() => {
    if (!spec.active) { setLeft(TURN_SECONDS); return; }
    const end = Date.now() + TURN_SECONDS * 1000;
    setLeft(TURN_SECONDS);
    const tick = window.setInterval(() => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000))), 1000);
    const timeout = window.setTimeout(() => cb.current(), TURN_SECONDS * 1000);
    return () => { window.clearInterval(tick); window.clearTimeout(timeout); };
  }, [spec.active, spec.id]);

  if (!spec.active) return <div className="h-[18px]" />;
  const color = left <= 4 ? '#ef4444' : left <= 8 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-2" role="timer" aria-label={`${left} segundos`}>
      <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-white/10">
        <div key={String(spec.id)} className="turn-bar h-full w-full origin-left rounded-full will-change-transform" style={{ animationDuration: `${TURN_SECONDS}s` }} />
      </div>
      <span className="font-mono w-7 text-right text-[11px] font-bold tabular-nums" style={{ color }}>{left}s</span>
    </div>
  );
}

/** Alias histórico. */
export const TurnTimer = TurnTimerBar;
