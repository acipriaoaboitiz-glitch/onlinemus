import type { ReactNode } from 'react';

/**
 * Mesa semicircular de casino: canto recto arriba (crupier) y curva abajo (puestos de apuesta).
 * Rail de cuero oscuro con brillo, ribete dorado, fieltro esmeralda con tejido sutil.
 * CSS/SVG estáticos, sin filtros: ligero en móvil.
 */
export function SemiTable({ children }: { children: ReactNode }) {
  const RADIUS = '4% 4% 50% 50% / 3% 3% 46% 46%';
  return (
    <div className="grid h-full w-full place-items-center">
    <div className="relative h-full w-full lg:h-auto lg:w-[min(100%,calc((100dvh/var(--z,1)-330px)*1.3333))] lg:aspect-[4/3]">
      <div aria-hidden className="absolute inset-[1%_1.2%]" style={{ borderRadius: RADIUS, background: 'linear-gradient(180deg,#1b1f1d 0%,#121514 45%,#0b0d0c 100%)', boxShadow: 'inset 0 5px 12px rgba(255,255,255,.09), inset 0 -12px 24px rgba(0,0,0,.85), 0 14px 28px rgba(0,0,0,.55)' }} />
      <div aria-hidden className="absolute inset-[6%_5.6%_5%]" style={{ borderRadius: RADIUS, border: '2px solid rgba(212,175,55,.32)', boxShadow: '0 0 0 1px rgba(0,0,0,.6), inset 0 0 0 1px rgba(251,224,138,.35)' }} />
      <div aria-hidden className="absolute inset-[6.8%_6.3%_5.8%] overflow-hidden" style={{ borderRadius: RADIUS, background: 'radial-gradient(ellipse at 50% 30%, #0B2E20 0%, #0A2819 55%, #061A12 100%)', boxShadow: 'inset 0 0 40px rgba(0,0,0,.55)' }}>
      </div>
      {children}
    </div>
    </div>
  );
}

/** Zapato (dispensador) de cartas: caja acrílica oscura con las cartas asomando. */
export function Shoe({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${count} cartas en el zapato`}>
      <div className="relative h-[calc(var(--card-w)*.62)] w-[calc(var(--card-w)*.8)] rounded-md"
        style={{ background: 'linear-gradient(135deg,#2a2f2d,#0a0c0b)', border: '1px solid rgba(255,255,255,.22)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3), 0 4px 8px rgba(0,0,0,.5)' }}>
        <span className="absolute inset-x-[10%] top-[16%] h-[34%] rounded-sm bg-[#e9e4d2]" style={{ transform: 'skewX(-14deg)' }} />
        <span className="absolute inset-x-[10%] top-[30%] h-[34%] rounded-sm bg-[#1f6b52]" style={{ transform: 'skewX(-14deg)', border: '1px solid #d4af37' }} />
      </div>
      <span className="font-mono text-[10px] text-amber-200/80">{count}</span>
    </div>
  );
}

/** Ranura de descarte. */
export function DiscardSlot() {
  return (
    <div className="grid justify-items-center gap-0.5" aria-hidden>
      <span className="block h-[calc(var(--card-w)*.14)] w-[calc(var(--card-w)*.72)] rounded-full" style={{ background: '#050807', border: '1px solid rgba(255,255,255,.2)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.9)' }} />
    </div>
  );
}
