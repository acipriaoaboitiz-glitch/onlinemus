import { useCallback, useRef, type PointerEvent as RPointerEvent } from 'react';

/**
 * Gesto natural de lanzar una carta: toque normal o deslizamiento hacia arriba (≥ 28 px). El deslizamiento dispara `fire` al
 * instante y el «click» que el navegador envía después se ignora, para no lanzar dos veces.
 */
export function useThrow(fire: () => void, enabled: boolean) {
  const startY = useRef<number | null>(null);
  const swiped = useRef(0);
  const onPointerDown = useCallback((e: RPointerEvent) => { startY.current = e.clientY; }, []);
  const onPointerMove = useCallback((e: RPointerEvent) => {
    if (!enabled || startY.current === null) return;
    if (startY.current - e.clientY >= 28) { startY.current = null; swiped.current = Date.now(); fire(); }
  }, [enabled, fire]);
  const end = useCallback(() => { startY.current = null; }, []);
  /** Úsalo como onClick: ignora el click que sigue a un swipe. */
  const click = useCallback(() => { if (Date.now() - swiped.current < 450) return; fire(); }, [fire]);
  return { handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end }, click };
}
