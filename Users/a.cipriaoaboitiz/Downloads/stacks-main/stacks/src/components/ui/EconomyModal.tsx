import { Portal } from './Portal.tsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Gift, LifeBuoy, Target, X } from 'lucide-react';
import { useT } from '../../i18n/index.ts';
import { chipRain } from './ChipRain.tsx';
import { progression, useMissions } from '../../store/progression.ts';
import { feedback, FAST_EASE } from '../../store/settings.ts';
import { canClaimDaily, canRescue, DAILY_STREAK, nextStreak, RESCUE_BELOW, RESCUE_CHIPS, useWallet, wallet } from '../../store/wallet.ts';
import { useBackClose } from '../../services/backStack.ts';

/** Modal del «+» del saldo: bono diario progresivo (racha de 7 días) y rescate de 250 fichas si bajas de 50. */
export function EconomyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useBackClose(open, onClose);
  const t = useT();
  const w = useWallet();
  const can = canClaimDaily(w);
  const day = nextStreak(w); // día de la racha que se cobra hoy (o el ya cobrado)
  const rescue = canRescue(w);
  const missions = useMissions();
  return (
    <Portal><AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FAST_EASE} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={t('eco.title')}
            className="border border-white/[0.08] bg-[#091511] shadow-2xl max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-3xl p-4" initial={{ scale: 0.94, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} transition={FAST_EASE}
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <Gift size={20} className="text-amber-300" aria-hidden />
              <h2 className="flex-1 text-[19px] font-bold tracking-tight text-white">{t('eco.title')}</h2>
              <button type="button" onClick={onClose} aria-label={t('a.close')} className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: '#ffffff14' }}><X size={16} /></button>
            </div>

            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.1em] text-amber-300/90">{t(day === 1 ? 'eco.streak1' : 'eco.streakN', { n: day })}</p>
            <div className="grid grid-cols-7 gap-1.5" aria-label={t('eco.title')}>
              {DAILY_STREAK.map((amt, i) => {
                const done = can ? i + 1 < day : i + 1 <= day;
                const today = can && i + 1 === day;
                return (
                  <div key={i} className={`grid justify-items-center rounded-xl border px-0.5 py-1.5 text-center ${today ? 'border-amber-300 bg-amber-300/15' : done ? 'border-emerald-400/40 bg-emerald-900/30' : 'border-white/10 bg-white/5'}`}>
                    <span className="text-[9px] font-bold text-stone-400">{t('eco.day', { n: i + 1 })}</span>
                    {done ? <Check size={14} className="my-0.5 text-emerald-300" aria-label={t('eco.claimed')} /> : <b className="my-0.5 text-[11px] tabular-nums text-amber-200">{amt}</b>}
                  </div>
                );
              })}
            </div>
            <button type="button" className="btn btn--gold mt-3 w-full" disabled={!can}
              onClick={() => { const n = wallet.claimDaily(); if (n) { feedback('win'); chipRain(10); } }}>
              {can ? t('eco.claim', { n: DAILY_STREAK[day - 1]! }) : t('eco.done')}
            </button>
            <p className="mt-1.5 text-center text-[11px] text-stone-400">{t('eco.streakNote', { n: DAILY_STREAK[6]! })}</p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[.1em] text-amber-300"><Target size={14} aria-hidden /> {t('eco.missions')}</p>
              <ul className="grid gap-2">
                {missions.map((m) => (
                  <li key={m.id} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 text-[13px] font-bold">{t(`m.${m.id}`)}</span>
                      <button type="button" disabled={!m.done || m.claimed} onClick={() => { if (progression.claim(m.id)) { feedback('win'); chipRain(8); } }}
                        className={`min-h-8 shrink-0 touch-manipulation rounded-full px-3 text-[12px] font-extrabold tabular-nums active:scale-95 ${m.done && !m.claimed ? 'bg-gradient-to-b from-[#FCE38A] to-[#D4AF37] text-[#2a1d02]' : 'bg-white/10 text-stone-400'}`}>
                        {m.claimed ? t('eco.mDone') : `+${m.reward}`}
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#FCE38A]" style={{ width: `${(m.progress / m.target) * 100}%` }} /></div>
                      <span className="text-[11px] font-bold tabular-nums text-stone-300">{m.progress}/{m.target}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-center text-[10px] text-stone-500">{t('eco.mNote')}</p>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[.1em] text-teal-300"><LifeBuoy size={14} aria-hidden /> {t('eco.rescue')}</p>
              <p className="mb-2 text-[12px] text-stone-300">{t('eco.rescueText', { a: RESCUE_BELOW, b: RESCUE_CHIPS })}</p>
              <button type="button" className="btn w-full" disabled={!rescue} onClick={() => { if (wallet.claimRescue()) { feedback('chip'); chipRain(6); } }}>
                {rescue ? t('eco.rescueBtn', { n: RESCUE_CHIPS }) : t('eco.rescueOff', { n: RESCUE_BELOW })}
              </button>
            </div>
            <p className="mt-3 text-center text-[10px] text-stone-500">{t('eco.free')}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence></Portal>
  );
}
