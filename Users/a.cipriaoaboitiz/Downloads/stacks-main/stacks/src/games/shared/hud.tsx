import type { ReactNode } from 'react';

const TONES = ['from-teal-400/10 text-teal-300', 'from-orange-400/10 text-orange-300', 'from-amber-400/10 text-amber-300', 'from-sky-400/10 text-sky-300'] as const;

/** Píldoras del Top HUD de los juegos (marcador, récord, tiempo…): etiqueta pequeña arriba y valor tabular abajo. */
export function HudPills({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div className="grid gap-[min(1.8vw,8px)]" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }} role="group">
      {items.map((it, i) => (
        <div key={it.label} className={`min-w-0 rounded-[13px] border border-white/10 bg-gradient-to-br ${TONES[i % TONES.length]!.split(' ')[0]} to-black/30 px-2.5 py-1.5`}>
          <p className={`truncate text-[8.5px] font-extrabold uppercase tracking-[.03em] ${TONES[i % TONES.length]!.split(' ')[1]}`}>{it.label}</p>
          <b className="flex items-center gap-1 truncate text-[13px] tabular-nums">{it.value}</b>
        </div>
      ))}
    </div>
  );
}

/** Botón del Action Rail (dock inferior): primario dorado o secundario de cristal oscuro. */
export function RailButton({ children, onClick, disabled, primary, active, label }: { children: ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean; active?: boolean; label?: string }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
      className={`flex h-12 min-w-0 flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-2xl px-3 text-[13px] font-bold transition-opacity active:scale-95 disabled:opacity-35 ${primary ? 'bg-gradient-to-b from-[#FCE38A] to-[#D4AF37] font-extrabold text-[#2a1d02]' : active ? 'border border-[#D4AF37]/60 bg-[#D4AF37]/15 text-[#FCE38A]' : 'border border-white/10 bg-white/[0.07] text-white'}`}>
      {children}
    </button>
  );
}
