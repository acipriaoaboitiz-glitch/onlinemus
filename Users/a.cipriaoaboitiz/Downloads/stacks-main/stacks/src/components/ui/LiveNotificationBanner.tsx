import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, UserPlus, X, Swords, Sparkles } from 'lucide-react';
import { social, useSocial, type Notice } from '../../store/social.ts';
import { feedback } from '../../store/settings.ts';
import { useT } from '../../i18n/index.ts';

const LIFETIME = { friend: 14000, invite: 16000, info: 4500 } as const;

function Pill({ n }: { n: Notice }) {
  const nav = useNavigate();
  const t = useT();
  useEffect(() => {
    const t = window.setTimeout(() => social.dismiss(n.id), LIFETIME[n.kind]);
    return () => window.clearTimeout(t);
  }, [n.id, n.kind]);
  const Icon = n.kind === 'friend' ? UserPlus : n.kind === 'invite' ? Swords : Sparkles;
  const join = () => {
    feedback('big');
    social.respondInvite(n, 'accepted');
    // Entra directo en la sala (aunque estés jugando contra la IA): el lobby abre `?join=` sin pasos intermedios.
    nav(`/?join=${n.code}&game=${n.game ?? 'mus'}`);
  };
  return (
    <motion.div layout role="status"
      className="pointer-events-auto flex max-w-[min(92vw,420px)] items-center gap-2 rounded-[22px] border border-[#D4AF37]/70 bg-[#04120C]/95 py-1.5 pl-2.5 pr-1.5 shadow-[0_10px_28px_rgba(0,0,0,.6),inset_0_1px_rgba(252,227,138,.18)]"
      initial={{ y: -70, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -60, opacity: 0, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
      <Icon size={16} className="shrink-0 text-[#FCE38A]" aria-hidden />
      <span className="min-w-0 flex-1 text-[13px] font-bold leading-tight text-stone-100 [overflow-wrap:anywhere]">{n.text}</span>
      {n.kind === 'friend' && n.from && (
        <>
          <button type="button" onClick={() => { feedback('chip'); social.accept(n.from!.uid); social.dismiss(n.id); }}
            className="flex min-h-8 shrink-0 touch-manipulation select-none items-center gap-1 rounded-full bg-gradient-to-b from-[#FCE38A] to-[#D4AF37] px-3 text-[12px] font-extrabold text-[#2a1d02] active:scale-95">
            <Check size={14} aria-hidden /> {t('soc.accept')}
          </button>
          <button type="button" aria-label={t('soc.decline')} onClick={() => { social.decline(n.from!.uid); social.dismiss(n.id); }}
            className="grid size-8 shrink-0 touch-manipulation select-none place-items-center rounded-full bg-white/10 text-stone-200 active:scale-95"><X size={14} aria-hidden /></button>
        </>
      )}
      {n.kind === 'invite' && (
        <>
          <button type="button" onClick={join}
            className="min-h-8 shrink-0 touch-manipulation select-none rounded-full bg-gradient-to-b from-[#FCE38A] to-[#D4AF37] px-3 text-[12px] font-extrabold text-[#2a1d02] active:scale-95">{t('n.join')}</button>
          <button type="button" aria-label={t('n.ignore')} title={t('n.ignore')} onClick={() => social.respondInvite(n, 'declined')}
            className="grid size-8 shrink-0 touch-manipulation select-none place-items-center rounded-full bg-white/10 text-stone-200 active:scale-95"><X size={14} aria-hidden /></button>
        </>
      )}
    </motion.div>
  );
}

/**
 * Avisos tipo isla dinámica, anclados arriba al centro: solicitudes de amistad e invitaciones a sala, también en plena partida.
 * El contenedor no captura toques (`pointer-events-none`); solo las píldoras son pulsables, así que nunca tapa el tablero.
 */
export function LiveNotificationBanner() {
  const { notices } = useSocial();
  return (
    <div className="pointer-events-none fixed left-1/2 z-[60] flex w-full -translate-x-1/2 flex-col items-center gap-1.5 px-2" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }} aria-live="polite">
      <AnimatePresence initial={false}>
        {notices.map((n) => <Pill key={n.id} n={n} />)}
      </AnimatePresence>
    </div>
  );
}
