import { Portal } from './Portal.tsx';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { GameInfo } from '../../games/registry.ts';
import { useBackClose } from '../../services/backStack.ts';
import { rulesFor, useT } from '../../i18n/index.ts';

/** Bottom-sheet con las reglas rápidas de cada juego. */
export function RulesModal({ game, onClose }: { game: GameInfo | null; onClose: () => void }) {
  useBackClose(Boolean(game), onClose);
  const t = useT();
  return (
    <Portal><AnimatePresence>
      {game && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: '#000a' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={`${t('lobby.rulesPick')} · ${t(`g.${game.id}.name`)}`}
            className="w-full max-w-md rounded-t-2xl border border-white/[0.08] bg-[#091511] shadow-2xl p-5"
            style={{ paddingBottom: 'calc(20px + var(--safe-b))', maxHeight: '85dvh', overflowY: 'auto' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-3">
              <game.icon size={26} style={{ color: game.accent }} aria-hidden />
              <div className="flex-1">
                <h2 className="text-[19px] font-bold tracking-tight text-white">{t(`g.${game.id}.name`)}</h2>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-muted)' }}>{t(`g.${game.id}.pl`)}</p>
              </div>
              <button type="button" onClick={onClose} aria-label={t('a.close')}
                className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: 'var(--color-surface-2)' }}>
                <X size={18} />
              </button>
            </div>
            <ol className="flex flex-col gap-2.5">
              {rulesFor(game.id, game.rules, undefined).map((r, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-snug">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-extrabold"
                    style={{ background: '#fde04722', color: '#fde047' }}>{i + 1}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence></Portal>
  );
}
