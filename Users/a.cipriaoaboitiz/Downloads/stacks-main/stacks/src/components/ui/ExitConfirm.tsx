import { Portal } from './Portal.tsx';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '../../i18n/index.ts';
import { useBackClose } from '../../services/backStack.ts';

let openDialog: (() => void) | null = null;
/** ¿Hay una pantalla de resultado abierta? Entonces la partida ya acabó y se puede salir sin preguntar. */
const finished = (): boolean => Boolean(document.querySelector('[data-result-overlay]'));

/**
 * Pide salir de la mesa: abre «¿Salir de la partida?» (Continuar / Salir). Devuelve false si la partida ya terminó
 * (el llamador sale directamente).
 */
export function askExit(): boolean {
  if (finished() || !openDialog) return false;
  openDialog();
  return true;
}

/**
 * Se monta dentro de cada mesa. Gestiona el mini-diálogo de salida y el botón/gesto «Atrás» de Android: ninguno saca de golpe
 * de una partida en curso. Un segundo «Atrás» cierra el diálogo y sigues jugando.
 */
export function ExitConfirm({ onExit }: { onExit: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    openDialog = () => setOpen(true);
    return () => { openDialog = null; };
  }, []);
  useBackClose(true, () => { if (finished()) onExit(); else setOpen(true); });
  useBackClose(open, () => setOpen(false));
  return (
    <Portal><AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} onClick={() => setOpen(false)}>
          <motion.div role="alertdialog" aria-modal="true" aria-label={t('exit.title')}
            className="w-full max-w-xs rounded-3xl border border-amber-500/30 bg-[#05140E] p-5 text-center shadow-[0_24px_70px_rgba(0,0,0,.65)]"
            initial={{ scale: 0.94, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.16 }} onClick={(e) => e.stopPropagation()}>
            <h2 className="font-[var(--font-display)] text-xl font-bold text-amber-300">{t('exit.title')}</h2>
            <p className="mt-1 text-[13px] text-stone-300">{t('exit.body')}</p>
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn btn--gold touch-manipulation">{t('exit.stay')}</button>
              <button type="button" onClick={() => { setOpen(false); onExit(); }} className="btn touch-manipulation">{t('exit.leave')}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence></Portal>
  );
}
