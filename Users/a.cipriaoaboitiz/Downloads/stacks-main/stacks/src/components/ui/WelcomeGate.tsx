import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, UserRound } from 'lucide-react';
import { Logo, Wordmark } from './Logo.tsx';
import { ProfileEditor } from './ProfileEditor.tsx';
import { AccountPanel } from './AccountPanel.tsx';
import { useT } from '../../i18n/index.ts';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase.ts';
import { account, hasActiveSession, markSession } from '../../store/account.ts';
import { saveProfile, TITLES, useProfile } from '../../store/profile.ts';
import { APP_NAME } from '../../config.ts';

type Tab = 'create' | 'signin' | 'guest';

/** Pantalla de carga mientras se comprueba la sesión: solo la «S» geométrica dorada, sin cuadrado ni marco. */
function SessionLoader() {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#061810]" role="status" aria-label={APP_NAME}>
      <motion.div animate={{ opacity: [0.55, 1, 0.55], scale: [0.96, 1, 0.96] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
        <Logo size="lg" />
      </motion.div>
    </div>
  );
}

const field = 'w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-[14px] text-stone-100 outline-none focus:border-amber-300/60';

/** «Crear cuenta»: apodo (el #TAG se asigna solo), correo y contraseña. Guarda el perfil con 1.000 fichas y vincula la cuenta. */
function CreateAccount({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [nick, setNick] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const valid = nick.trim().length > 0 && /\S+@\S+\.\S+/.test(email) && password.length >= 6;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true); setMsg(null);
    const r = await account.signUp(email.trim(), password);
    if (!r.ok) { setBusy(false); setMsg(t('acc.error', { e: r.error })); return; }
    saveProfile({ name: nick.trim(), title: TITLES[3], avatar: 0, photo: null }); // 1.000 fichas de inicio (wallet) y #TAG automático (identity)
    markSession('account');
    setBusy(false);
    onDone();
  };
  return (
    <form onSubmit={(e) => { void submit(e); }} className="grid gap-2.5" aria-label={t('acc.tabCreate')}>
      <label className="relative block">
        <UserRound size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} placeholder={t('acc.nick')} aria-label={t('acc.nick')} autoComplete="nickname" className={field} />
      </label>
      <p className="-mt-1 px-1 text-[11px] text-stone-400">{t('acc.tagAuto')} {t('acc.createHint')}</p>
      <label className="relative block">
        <Mail size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('acc.email')} aria-label={t('acc.email')} className={field} />
      </label>
      <label className="relative block">
        <Lock size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('acc.password')} aria-label={t('acc.password')} className={field} />
      </label>
      <button type="submit" disabled={!valid || busy} className="gold-foil min-h-12 touch-manipulation rounded-2xl text-[15px] font-extrabold active:scale-95 disabled:opacity-40">{busy ? t('acc.wait') : t('acc.create')}</button>
      <button type="button" disabled={busy} onClick={() => { void account.signInGoogle(); }} className="h-11 touch-manipulation rounded-xl border border-white/15 bg-white/10 text-[13px] font-bold text-stone-100 active:scale-95">{t('acc.google')}</button>
      {msg && <p role="alert" className="text-center text-[12px] font-bold text-red-300">{msg}</p>}
      {!isSupabaseConfigured && <p className="text-center text-[11px] text-amber-200/80">{t('acc.localOnly')}</p>}
    </form>
  );
}

/**
 * Acceso: la PRIMERA vez se muestra obligatoriamente (Crear cuenta · Iniciar sesión · Entrar como invitado). Después, la sesión
 * persiste (Supabase `persistSession` + `stacks_active_session`) y se entra directo al lobby, tras un loader con la «S», hasta que el
 * jugador pulse «Cerrar sesión» en Perfil o Ajustes.
 */
export function WelcomeGate({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const t = useT();
  const [tab, setTab] = useState<Tab>('create');
  // Si ya hay perfil o marca de sesión, se verifica la sesión con un loader breve; si no, se muestra el acceso al instante.
  const [checking, setChecking] = useState(() => Boolean(profile) || hasActiveSession());
  useEffect(() => {
    if (!checking) return;
    const c = getSupabase();
    const min = new Promise<void>((r) => window.setTimeout(r, 350));
    const session = c ? Promise.race([c.auth.getSession().then(() => undefined), new Promise<void>((r) => window.setTimeout(r, 900))]).catch(() => undefined) : Promise.resolve();
    void Promise.all([min, session]).then(() => setChecking(false));
  }, [checking]);

  if (checking) return <SessionLoader />;
  if (profile) return <>{children}</>;

  const tabs: { id: Tab; label: string }[] = [{ id: 'create', label: t('acc.tabCreate') }, { id: 'signin', label: t('acc.tabSignIn') }];
  return (
    // El body tiene overflow oculto: el gate scrollea por sí mismo (fixed + overflow-y-auto) para que en móviles bajos o con teclado se llegue siempre al botón.
    <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="grid min-h-full place-items-center px-4 py-6" style={{ paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm rounded-3xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,.65)]">
          <div className="mb-4 grid justify-items-center gap-4 text-center">
            <Logo size="lg" />
            <h1 aria-label={APP_NAME}><Wordmark size={26} /></h1>
          </div>

          {tab !== 'guest' && (
            <div className="relative mb-4 grid grid-cols-2 rounded-2xl bg-black/30 p-1" role="tablist">
              {tabs.map((x) => (
                <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)} className="relative z-10 h-10 touch-manipulation rounded-xl text-[13px] font-bold">
                  {tab === x.id && <motion.span layoutId="gate-tab" className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-b from-[#FCE38A] to-[#D4AF37]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className={tab === x.id ? 'text-[#2a1d02]' : 'text-stone-300'}>{x.label}</span>
                </button>
              ))}
            </div>
          )}

          {tab === 'create' && <CreateAccount onDone={() => { /* el perfil guardado cierra el acceso */ }} />}
          {tab === 'signin' && <AccountPanel mode="signin" onDone={() => setTab('guest')} />}
          {tab === 'guest' && (
            <ProfileEditor initial={{ name: '', title: TITLES[3], avatar: 0, photo: null }} submitLabel="Entrar al club" onSubmit={(p) => { saveProfile(p); markSession('guest'); }} />
          )}

          <button type="button" onClick={() => setTab(tab === 'guest' ? 'create' : 'guest')} className="mt-3 w-full touch-manipulation text-center text-[12px] font-bold text-amber-200/70 underline-offset-2 hover:underline">
            {tab === 'guest' ? t('acc.back') : t('acc.guestEnter')}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
