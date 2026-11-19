import { THEMES, useSettings } from '../../store/settings.ts';

/** Fondo de club privado: paño del tapete elegido, fondo liso radial (sin cuadrículas ni patrones) y viñeta. */
export function ClubBackground() {
  const th = THEMES[useSettings().theme];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0, background: th.c }}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 35%, ${th.a} 0%, ${th.b} 55%, ${th.c} 100%)` }} />
    </div>
  );
}
