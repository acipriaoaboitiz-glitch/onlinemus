import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renderiza modales y drawers directamente en `document.body`: así ningún ancestro con `transform`, `z-index` o `overflow`
 * (carrusel, cabecera, barra de categorías, `desk-zoom`) puede recortarlos ni cruzarse por encima.
 * Jerarquía: carrusel z-10 · cabecera y categorías z-20 · modales z-50 · avisos en vivo z-[60] · cinemáticas z-[70].
 */
export function Portal({ children }: { children: ReactNode }) {
  return typeof document === 'undefined' ? null : createPortal(children, document.body);
}
