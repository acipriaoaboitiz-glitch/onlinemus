import { Portal } from './Portal.tsx';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import { GAMES } from '../../games/registry.ts';
import { useT } from '../../i18n/index.ts';
import { saveProfile, useProfile } from '../../store/profile.ts';
import { useWallet } from '../../store/wallet.ts';
import { PlayerAvatar, RANKS, rankFor } from './Hud.tsx';
import { ProfileEditor } from './ProfileEditor.tsx';
import { AccountPanel } from './AccountPanel.tsx';
import { useBackClose } from '../../services/backStack.ts';

/** Modal de edición del perfil (nombre, título, foto/avatar) con rango y victorias. */
export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useBackClose(open, onClose);
  const w = useWallet();
  const prof = useProfile();
  const t = useT();
  const rank = rankFor(w.chips);
  const next = RANKS.find((r) => r.min > w.chips);
  const cur = RANKS[rank.level - 1]!;
  const pct = next ? Math.min(100, ((w.chips - cur.min) / (next.min - cur.min)) * 100) : 100;
  const totalWins = Object.values(w.wins).reduce((a, b) => a + b, 0);
  if (!prof) return null;
  return (
    <Portal><AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label="Perfil"
            className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#091511] shadow-2xl p-4"
            initial={{ y: 24, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 24, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center">
              <h2 className="flex-1 text-[19px] font-bold tracking-tight text-white">Perfil</h2>
              <button type="button" onClick={onClose} aria-label={t('set.close')} className="grid size-9 place-items-center rounded-full bg-white/[0.08] text-white/80"><X size={18} /></button>
            </div>
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: rank.color }}>{rank.name} · Nivel {rank.level}</p>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${rank.color}, #fff3b0)` }} /></div>
              <p className="mt-1 flex items-center justify-between text-[10px] text-stone-400"><span>{next ? `${w.chips.toLocaleString('es-ES')} / ${next.min.toLocaleString('es-ES')} fichas` : 'Rango máximo'}</span><span className="flex items-center gap-1"><Trophy size={11} />{totalWins} victorias</span></p>
            </div>
            <ProfileEditor initial={prof} submitLabel="Guardar" onSubmit={(p) => { saveProfile(p); onClose(); }} />
            <h3 className="mb-2 mt-5 px-1 text-[11px] font-bold uppercase tracking-[.14em] text-white/45">{t('acc.title')}</h3>
            <AccountPanel />
            <h3 className="mb-2 mt-5 px-1 text-[11px] font-bold uppercase tracking-[.14em] text-white/45">Victorias por juego</h3>
            <ul className="grid grid-cols-2 gap-1.5">
              {GAMES.map((g) => (
                <li key={g.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-1.5 text-[12px]"><g.icon size={14} style={{ color: g.accent }} /><span className="flex-1 truncate">{t(`g.${g.id}.name`)}</span><b className="font-mono">{w.wins[g.id] ?? 0}</b></li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence></Portal>
  );
}

/** Tarjeta de perfil (foto + nombre + título + fichas); al pulsarla abre el modal de edición. */
export function ProfileCard({ compact = false }: { compact?: boolean }) {
  const prof = useProfile();
  const w = useWallet();
  const [open, setOpen] = useState(false);
  if (!prof) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Editar perfil"
        className="flex min-w-0 items-center gap-2 rounded-2xl border border-amber-200/15 bg-black/30 py-1 pl-1 pr-2.5 text-left">
        <PlayerAvatar name={prof.name} chips={w.chips} size={compact ? 34 : 44} />
        <span className={`min-w-0 leading-tight ${compact ? "hidden max-w-[68px] min-[460px]:block" : ""}`}>
          <b className="block truncate text-[13px]">{prof.name}</b>
          <small className="block truncate text-[10px] font-bold text-amber-300/90">{compact ? w.chips.toLocaleString('es-ES') : prof.title}</small>
        </span>
      </button>
      <ProfileModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
