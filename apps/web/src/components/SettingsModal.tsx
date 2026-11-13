import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameSettings, TABLE_COLORS } from '../lib/settings.tsx';
import { IconClose, IconGear } from './icons.tsx';

/** Modal central de cristal oscuro: silencio global y color del tapete (se previsualiza al instante en la mesa de detrás). */
export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isMuted, toggleMute, tableColor, setTableColor, playSound, volume, setVolume } = useGameSettings();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center p-4 bg-black/45 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Ajustes"
            className="w-[min(92vw,380px)] rounded-3xl border border-white/15 bg-neutral-950/55 p-6 text-stone-100 shadow-2xl shadow-black/60 backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-[var(--font-display)] text-xl font-bold"><IconGear /> Ajustes</h2>
              <button
                type="button"
                aria-label="Cerrar ajustes"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 hover:bg-white/10"
                onClick={onClose}
              >
                <IconClose />
              </button>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isMuted}
              onClick={() => { const wasMuted = isMuted; toggleMute(); if (wasMuted) playSound('click'); }}
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10"
            >
              <span>
                <b className="block text-[15px]">Silenciar el juego</b>
                <small className="block text-[13px] text-stone-400">Apaga todos los efectos de sonido</small>
              </span>
              <i className={`switch${isMuted ? ' on' : ''}`} />
            </button>

            <div className="mt-5 space-y-3">
              <div className="cfg__volume">
                <div className="mb-2 flex items-center justify-between gap-3 text-[12px] uppercase tracking-[0.18em] text-stone-400">
                  <span>Volumen</span>
                  <b className="text-[11px] font-bold text-amber-300">{Math.round(volume * 100)}%</b>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(volume * 100)}
                  aria-label="Volumen del juego"
                  onChange={(e) => setVolume(Number(e.target.value) / 100)}
                  className="w-full accent-amber-400"
                />
              </div>
            </div>

            <div className="mt-5">
              <span className="mb-3 block text-xs uppercase tracking-widest text-stone-400">Color del tapete</span>
              <div className="flex items-center justify-center gap-5" role="radiogroup" aria-label="Color del tapete">
                {TABLE_COLORS.map((c) => (
                  <ColorDot key={c.id} label={c.label} swatch={c.swatch} selected={tableColor === c.id} onPick={() => setTableColor(c.id)} />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ColorDot({ label, swatch, selected, onPick }: { label: string; swatch: string; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`Tapete ${label.toLowerCase()}`}
      title={label}
      onClick={onPick}
      className="grid justify-items-center gap-2"
    >
      <motion.span
        className="block h-14 w-14 rounded-full border border-white/25 shadow-lg shadow-black/50"
        style={{ background: swatch }}
        animate={{ scale: selected ? 1.12 : 1, boxShadow: selected ? '0 0 0 3px rgba(240,195,95,.95), 0 8px 22px rgba(0,0,0,.5)' : '0 6px 16px rgba(0,0,0,.45)' }}
        whileHover={{ scale: selected ? 1.12 : 1.06 }}
        transition={{ duration: 0.15 }}
      />
      <span className={`text-xs ${selected ? 'text-amber-300' : 'text-stone-400'}`}>{label}</span>
    </button>
  );
}

/** Engranaje que abre los ajustes. Vale tanto en la mesa como en la portada. */
export function SettingsButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`icon-btn ${className}`} aria-label="Ajustes" onClick={() => setOpen(true)}>
        <IconGear />
      </button>
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
