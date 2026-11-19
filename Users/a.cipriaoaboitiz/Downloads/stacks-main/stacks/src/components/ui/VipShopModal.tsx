import { Portal } from './Portal.tsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Gem, X } from 'lucide-react';
import { useT } from '../../i18n/index.ts';
import { CardBackArt } from '../cards/FrenchFace.tsx';
import { BACKS, TAPETES, cosmetics, useCosmetics } from '../../store/cosmetics.ts';
import { THEMES, feedback, useSettings } from '../../store/settings.ts';
import { useWallet } from '../../store/wallet.ts';
import { useBackClose } from '../../services/backStack.ts';

/** «Club VIP»: dorsos de cartas y tapetes que se compran con fichas virtuales y se aplican en todos los juegos. */
export function VipShopModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useBackClose(open, onClose);
  const t = useT();
  const c = useCosmetics();
  const w = useWallet();
  const { theme } = useSettings();
  return (
    <Portal><AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={t('vip.title')}
            className="border border-white/[0.08] bg-[#091511] shadow-2xl w-full max-w-md overflow-y-auto rounded-t-2xl p-4 sm:rounded-2xl" style={{ maxHeight: '92dvh', paddingBottom: 'calc(16px + var(--safe-b))' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <Gem size={20} className="text-amber-300" aria-hidden />
              <h2 className="flex-1 text-[19px] font-bold tracking-tight text-white">{t('vip.title')}</h2>
              <span className="font-mono text-sm font-bold tabular-nums text-amber-200">{w.chips.toLocaleString('es-ES')}</span>
              <button type="button" onClick={onClose} aria-label={t('a.close')} className="grid size-9 touch-manipulation place-items-center rounded-xl bg-white/10"><X size={16} /></button>
            </div>

            <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[.14em] text-white/45">{t('vip.backs')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {BACKS.map((b) => {
                const owned = c.backs.includes(b.id);
                const on = c.back === b.id;
                return (
                  <div key={b.id} className={`grid justify-items-center gap-1.5 rounded-2xl border p-2.5 ${on ? 'border-amber-300 bg-amber-300/10' : 'border-white/10 bg-white/5'}`}>
                    <span className="block w-14 overflow-hidden rounded-lg shadow-[0_6px_14px_rgba(0,0,0,.5)]" style={{ aspectRatio: '2 / 3' }}><CardBackArt variant={b.variant} seal="" /></span>
                    <b className="text-center text-[12px] leading-tight">{t(`cb.${b.id}`)}</b>
                    {owned ? (
                      <button type="button" disabled={on} onClick={() => { cosmetics.equipBack(b.id); feedback('tap'); }}
                        className="flex min-h-9 w-full touch-manipulation items-center justify-center gap-1 rounded-full bg-white/10 text-[12px] font-bold active:scale-95 disabled:bg-emerald-900/50 disabled:text-emerald-200">
                        {on ? <><Check size={13} aria-hidden /> {t('vip.equipped')}</> : t('vip.equip')}
                      </button>
                    ) : (
                      <button type="button" disabled={w.chips < b.price} onClick={() => { if (cosmetics.buyBack(b.id)) feedback('win'); }}
                        className="min-h-9 w-full touch-manipulation rounded-full bg-gradient-to-b from-[#FCE38A] to-[#D4AF37] text-[12px] font-extrabold tabular-nums text-[#2a1d02] active:scale-95 disabled:opacity-40">
                        {b.price.toLocaleString('es-ES')} {t('vip.chipsUnit')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <h3 className="mb-2 mt-4 px-1 text-[11px] font-bold uppercase tracking-[.14em] text-white/45">{t('vip.mats')}</h3>
            <div className="grid grid-cols-3 gap-2">
              {TAPETES.map((tp) => {
                const owned = c.themes.includes(tp.id);
                const on = theme === tp.id;
                return (
                  <div key={tp.id} className={`grid justify-items-center gap-1.5 rounded-2xl border p-2 ${on ? 'border-amber-300 bg-amber-300/10' : 'border-white/10 bg-white/5'}`}>
                    <span className={`block size-12 rounded-full border-2 border-white/15 bg-gradient-to-br ${THEMES[tp.id].swatch}`} />
                    <b className="text-center text-[11px] leading-tight">{t(`tp.${tp.id}`)}</b>
                    {owned ? (
                      <button type="button" disabled={on} onClick={() => { cosmetics.equipTheme(tp.id); feedback('tap'); }}
                        className="min-h-8 w-full touch-manipulation rounded-full bg-white/10 text-[11px] font-bold active:scale-95 disabled:bg-emerald-900/50 disabled:text-emerald-200">{on ? t('vip.equipped') : t('vip.equip')}</button>
                    ) : (
                      <button type="button" disabled={w.chips < tp.price} onClick={() => { if (cosmetics.buyTheme(tp.id)) feedback('win'); }}
                        className="min-h-8 w-full touch-manipulation rounded-full bg-gradient-to-b from-[#FCE38A] to-[#D4AF37] text-[11px] font-extrabold tabular-nums text-[#2a1d02] active:scale-95 disabled:opacity-40">{tp.price.toLocaleString('es-ES')}</button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-center text-[10px] text-stone-500">{t('vip.note')}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence></Portal>
  );
}
