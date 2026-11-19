import { Portal } from './Portal.tsx';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import { Check, ChevronRight, Gauge, HelpCircle, Languages, Lock, LogOut, ScrollText, Smartphone, Trash2, Volume2, X, type LucideIcon } from 'lucide-react';
import { themeUnlocked, useCosmetics } from '../../store/cosmetics.ts';
import { useT } from '../../i18n/index.ts';
import { feedback, setSettings, THEMES, useSettings, type AnimSpeed, type Lang, type ThemeId } from '../../store/settings.ts';
import { useBackClose } from '../../services/backStack.ts';
import { account, useAccount } from '../../store/account.ts';

/** Interruptor tipo iOS: dorado encendido, gris oscuro apagado, con física de muelle. */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => { onChange(!on); feedback('tap'); }}
      className="relative h-[30px] w-[50px] shrink-0 touch-manipulation rounded-full transition-colors duration-200"
      style={{ background: on ? 'linear-gradient(180deg,#FCE38A,#D4AF37)' : 'rgba(255,255,255,.14)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.35)' }}>
      <motion.span className="absolute left-[3px] top-[3px] size-6 rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,.45)]"
        animate={{ x: on ? 20 : 0 }} transition={{ type: 'spring', stiffness: 520, damping: 30 }} />
    </button>
  );
}

/** Control segmentado tipo iOS con selector deslizante (layoutId propio por instancia). */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  const uid = useId();
  return (
    <div role="radiogroup" aria-label={label} className="relative grid rounded-[11px] bg-white/[0.07] p-[3px]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => { if (value !== o.id) { onChange(o.id); feedback('tap'); } }}
          className={`relative h-8 touch-manipulation rounded-lg text-[12.5px] font-bold transition-colors ${value === o.id ? 'text-[#2a1d02]' : 'text-white/60'}`}>
          {value === o.id && <motion.span layoutId={`seg-${uid}`} aria-hidden className="absolute inset-0 rounded-lg bg-gradient-to-b from-[#FCE38A] to-[#D4AF37] shadow-[0_1px_4px_rgba(0,0,0,.4)]" transition={{ type: 'spring', stiffness: 460, damping: 34 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Icono en cuadrado redondeado, como en los ajustes de iOS. */
export function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-white/[0.07] text-[#FCE38A]"><Icon size={17} strokeWidth={1.75} aria-hidden /></span>;
}

/** Fila de una lista agrupada: título, subtítulo discreto y control a la derecha. */
export function Row({ icon, title, sub, children, onClick }: { icon?: LucideIcon; title: string; sub?: string; children?: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      {icon && <RowIcon icon={icon} />}
      <span className="min-w-0 flex-1 text-left"><b className="block truncate text-[14.5px] font-semibold text-white">{title}</b>{sub && <small className="block truncate text-[12px] text-white/50">{sub}</small>}</span>
      {children}
    </>
  );
  return onClick
    ? <button type="button" onClick={onClick} className="flex w-full touch-manipulation items-center gap-3 px-3.5 py-3 active:bg-white/[0.04]">{body}</button>
    : <div className="flex items-center gap-3 px-3.5 py-3">{body}</div>;
}

/** Grupo de filas con separadores finos. */
export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="grid gap-1.5">
      {title && <h3 className="px-1 text-[11px] font-bold uppercase tracking-[.14em] text-white/45">{title}</h3>}
      <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">{children}</div>
    </section>
  );
}

/** Panel oscuro centrado (estilo Apple Arcade): fondo sólido sin desenfoque, para mantener los 60 FPS en móvil. */
export function Sheet({ open, onClose, title, label, children, max = 'max-w-md' }: { open: boolean; onClose: () => void; title: string; label: string; children: ReactNode; max?: string }) {
  return (
    <Portal><AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={label}
            className={`max-h-[92dvh] w-full ${max} overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#091511] p-4 shadow-2xl`}
            initial={{ y: 22, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 22, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3.5 flex items-center">
              <h2 className="flex-1 px-1 text-[19px] font-bold tracking-tight text-white">{title}</h2>
              <button type="button" onClick={onClose} aria-label="×" className="grid size-9 touch-manipulation place-items-center rounded-full bg-white/[0.08] text-white/80 active:scale-90"><X size={17} strokeWidth={1.75} /></button>
            </div>
            <div className="grid gap-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence></Portal>
  );
}

const LANGS: { id: Lang; label: string }[] = [{ id: 'es', label: 'ES' }, { id: 'en', label: 'EN' }, { id: 'fr', label: 'FR' }, { id: 'de', label: 'DE' }];

/** Ajustes globales (engranaje): tapete, idioma y experiencia de juego, con efecto en tiempo real. */
export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings();
  useBackClose(open, onClose);
  const acc = useAccount();
  useCosmetics(); // se repinta al comprar un tapete
  const [legal, setLegal] = useState<'privacidad' | 'terminos' | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const t = useT();
  const speeds: { id: AnimSpeed; label: string }[] = [{ id: 'normal', label: t('set.normal') }, { id: 'rapida', label: t('set.fast') }];
  return (
    <Sheet open={open} onClose={onClose} title={t('set.title')} label={t('set.title')}>
      <Group title={t('set.table')}>
        <div className="px-3.5 py-3">
          <div className="grid grid-cols-5 gap-2.5" role="radiogroup" aria-label={t('set.table')}>
            {(Object.keys(THEMES) as ThemeId[]).map((id) => (
              <button key={id} type="button" role="radio" aria-checked={s.theme === id} aria-label={t(`th.${id}`)} title={t(`th.${id}`)} disabled={!themeUnlocked(id)}
                onClick={() => { if (!themeUnlocked(id)) return; setSettings({ theme: id }); feedback('tap'); }} className="grid touch-manipulation justify-items-center active:scale-90">
                <span className={`relative grid aspect-square w-full max-w-12 place-items-center rounded-full bg-gradient-to-br ${THEMES[id].swatch} border-2 shadow-[inset_0_2px_6px_rgba(255,255,255,.12)] ${s.theme === id ? 'border-[#FCE38A]' : 'border-white/10'}`}>
                  {s.theme === id && <Check size={18} strokeWidth={2} className="text-[#FCE38A]" />}
                  {!themeUnlocked(id) && <span className="absolute inset-0 grid place-items-center rounded-full bg-black/60"><Lock size={15} strokeWidth={1.75} className="text-[#FCE38A]" aria-label="Bloqueado" /></span>}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-[12px] text-white/50">{t(`th.${s.theme}`)}</p>
        </div>
      </Group>

      <Group title={t('set.lang')}>
        <div className="px-3.5 py-3"><Segmented value={s.lang === 'eu' ? 'es' : s.lang} options={LANGS} onChange={(v) => setSettings({ lang: v })} label={t('set.lang')} /></div>
      </Group>

      <Group title={t('set.game')}>
        <Row icon={Volume2} title={t('set.sound')} sub={t('set.soundSub')}><Toggle on={s.sound} onChange={(v) => setSettings({ sound: v })} label={t('set.sound')} /></Row>
        <Row icon={Smartphone} title={t('set.vibration')} sub={t('set.vibSub')}><Toggle on={s.vibration} onChange={(v) => setSettings({ vibration: v })} label={t('set.vibration')} /></Row>
        <Row icon={HelpCircle} title={t('set.help')} sub={t('set.helpSub')}><Toggle on={s.help} onChange={(v) => setSettings({ help: v })} label={t('set.help')} /></Row>
        <div className="grid gap-2.5 px-3.5 py-3">
          <div className="flex items-center gap-3">
            <RowIcon icon={Gauge} />
            <span className="min-w-0 flex-1"><b className="block text-[14.5px] font-semibold text-white">{t('set.speed')}</b><small className="block text-[12px] text-white/50">{t('set.speedSub')}</small></span>
          </div>
          <Segmented value={s.speed} options={speeds} onChange={(v) => setSettings({ speed: v })} label={t('set.speed')} />
        </div>
      </Group>

      {acc.email && !acc.anonymous && (
        <Group>
          <Row icon={LogOut} title={t('acc.signOutAll')} sub={acc.email} onClick={() => { void account.signOutAndReset(); }}><ChevronRight size={16} strokeWidth={1.75} className="text-white/30" aria-hidden /></Row>
        </Group>
      )}

      <Group title={t('lg.title')}>
        <Row icon={ScrollText} title={t('lg.privacy')} onClick={() => setLegal(legal === 'privacidad' ? null : 'privacidad')}><ChevronRight size={16} strokeWidth={1.75} className="text-white/30" aria-hidden /></Row>
        <Row icon={Languages} title={t('lg.terms')} onClick={() => setLegal(legal === 'terminos' ? null : 'terminos')}><ChevronRight size={16} strokeWidth={1.75} className="text-white/30" aria-hidden /></Row>
        {legal && (
          <div className="max-h-44 overflow-y-auto px-3.5 py-3 text-[11.5px] leading-relaxed text-white/60">
            <p className="mb-1 font-semibold text-[#FCE38A]">{t('lg.template')}</p>
            <p>{legal === 'privacidad' ? t('lg.privacyText') : t('lg.termsText')}</p>
          </div>
        )}
        <p className="px-3.5 py-2.5 text-[11.5px] text-white/50">{t('lg.notice')}</p>
      </Group>

      <Group>
        <button type="button" onClick={() => { if (!confirmReset) { setConfirmReset(true); window.setTimeout(() => setConfirmReset(false), 4000); return; } try { localStorage.clear(); sessionStorage.clear(); } catch { /* sin almacenamiento */ } window.location.reload(); }}
          className={`flex w-full touch-manipulation items-center gap-3 px-3.5 py-3 text-left transition-colors ${confirmReset ? 'bg-red-600/90 text-white' : 'text-red-300'}`}>
          <Trash2 size={17} strokeWidth={1.75} aria-hidden /> <b className="text-[14.5px] font-semibold">{confirmReset ? t('lg.resetConfirm') : t('lg.reset')}</b>
        </button>
      </Group>
    </Sheet>
  );
}
