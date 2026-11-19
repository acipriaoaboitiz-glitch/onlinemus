import type { ReactNode } from 'react';

/**
 * Mesa ovalada de casino: rail de cuero oscuro con brillo en el canto, ribete dorado, fieltro esmeralda con
 * textura de tejido, línea discontinua de apuestas.
 * Todo con CSS estático (sin filtros ni animaciones): ligero en móvil. Los hijos se colocan sobre la mesa.
 */
export function OvalTable({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full w-full">
      {/* rail acolchado */}
      <div aria-hidden className="absolute inset-[0.5%_0.3%] rounded-[50%]"
        style={{ background: 'linear-gradient(180deg,#1c211f 0%,#141816 45%,#0b0d0c 100%)', boxShadow: 'inset 0 5px 12px rgba(255,255,255,.09), inset 0 -12px 24px rgba(0,0,0,.85), 0 16px 30px rgba(0,0,0,.55)' }} />
      {/* brillo del canto */}
      <div aria-hidden className="absolute inset-[1.4%_1%] rounded-[50%]" style={{ boxShadow: 'inset 0 2px 3px rgba(255,255,255,.14)' }} />
      {/* ribete dorado */}
      <div aria-hidden className="absolute inset-[5.2%_3.4%] rounded-[50%]" style={{ border: '2px solid rgba(212,175,55,.35)', boxShadow: '0 0 0 1px rgba(0,0,0,.6), inset 0 0 0 1px rgba(251,224,138,.35)' }} />
      {/* fieltro */}
      <div aria-hidden className="absolute inset-[6%_4.1%] overflow-hidden rounded-[50%]"
        style={{ background: 'radial-gradient(ellipse at 50% 46%, #0B2E20 0%, #0A2819 55%, #061A12 100%)', boxShadow: 'inset 0 0 40px rgba(0,0,0,.55)' }}>
      </div>
      {/* línea de apuestas */}
      <div aria-hidden className="absolute inset-[22%_15%] rounded-[50%]" style={{ border: '2px dashed rgba(212,175,55,.18)' }} />
      {children}
    </div>
  );
}
