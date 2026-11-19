import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, HelpCircle, Settings, Volume2, VolumeX } from 'lucide-react';
import { useT } from '../../i18n/index.ts';
import { feedback, setSettings, useSettings } from '../../store/settings.ts';
import { CAN_HOVER } from '../../store/settings.ts';

const BTN = 'grid size-9 shrink-0 place-items-center rounded-full border border-amber-200/20 bg-gradient-to-b from-zinc-800/90 to-zinc-950/90 text-stone-100 shadow-[0_4px_10px_rgba(0,0,0,.35),inset_0_1px_rgba(255,255,255,.1)]';

export function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button type="button" aria-label={label} title={label} className={BTN} whileHover={CAN_HOVER ? { scale: 1.08, boxShadow: '0 0 14px rgba(240,195,95,.45)' } : undefined} whileTap={{ scale: 0.9 }}
      onClick={() => { feedback('tap'); onClick(); }}>
      {children}
    </motion.button>
  );
}

export const ExitButton = ({ onClick }: { onClick: () => void }) => {
  const t = useT();
  return <IconBtn label={t('menu.exit')} onClick={onClick}><ArrowLeft size={17} /></IconBtn>;
};

/** Botones rápidos de la esquina: Reglas (?), Sonido on/off y Ajustes (engranaje), siempre visibles. */
export function QuickButtons({ onRules, onSettings }: { onRules?: () => void; onSettings: () => void }) {
  const t = useT();
  const { sound } = useSettings();
  return (
    <div className="flex items-center gap-1.5">
      {onRules && <IconBtn label={t('menu.rules')} onClick={onRules}><HelpCircle size={17} /></IconBtn>}
      <IconBtn label={sound ? t('menu.soundOn') : t('menu.soundOff')} onClick={() => setSettings({ sound: !sound })}>
        {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
      </IconBtn>
      <IconBtn label={t('menu.settings')} onClick={onSettings}><Settings size={17} /></IconBtn>
    </div>
  );
}
