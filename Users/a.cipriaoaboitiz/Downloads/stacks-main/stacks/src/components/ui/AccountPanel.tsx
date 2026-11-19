import { useState, type FormEvent } from 'react';
import { Cloud, LogIn, LogOut, Mail } from 'lucide-react';
import { useT } from '../../i18n/index.ts';
import { account, useAccount } from '../../store/account.ts';

/**
 * Cuenta de STACKS: invitado persistente por defecto; vincula correo + contraseña (o Google) para guardar fichas, victorias, amigos
 * y cosméticos en la nube y recuperarlos en cualquier dispositivo. `mode="signin"` (pantalla de bienvenida) solo inicia sesión.
 */
export function AccountPanel({ mode = 'link', onDone }: { mode?: 'link' | 'signin'; onDone?: () => void }) {
  const t = useT();
  const acc = useAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!acc.configured) return <p className="rounded-xl bg-white/5 px-3 py-2 text-[12px] text-stone-400">{t('acc.offline')}</p>;

  if (acc.email && !acc.anonymous) {
    return (
      <div className="grid gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-950/20 p-3">
        <p className="flex items-center gap-2 text-[12px] font-bold text-emerald-200"><Cloud size={15} aria-hidden /> {t('acc.cloud')} · {t('acc.signedAs', { e: acc.email })}</p>
        <button type="button" onClick={() => { void account.signOutAndReset(); }} className="flex h-10 touch-manipulation items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-[13px] font-bold text-stone-200">
          <LogOut size={15} aria-hidden /> {t('acc.signOutAll')}
        </button>
        <p className="text-center text-[10px] text-stone-500">{t('acc.signOutNote')}</p>
      </div>
    );
  }

  const run = async (kind: 'signIn' | 'signUp' | 'google') => {
    setBusy(true); setMsg(null);
    const r = kind === 'google' ? await account.signInGoogle() : kind === 'signIn' ? await account.signIn(email.trim(), password) : await account.signUp(email.trim(), password);
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: t('acc.error', { e: r.error }) }); return; }
    if (r.message === 'confirm') setMsg({ ok: true, text: t('acc.confirm') });
    else if (r.message === 'restored') { setMsg({ ok: true, text: t('acc.restored') }); onDone?.(); }
    else if (kind !== 'google') { setMsg({ ok: true, text: t('acc.new') }); onDone?.(); }
  };
  const submit = (e: FormEvent) => { e.preventDefault(); void run(mode === 'signin' ? 'signIn' : 'signUp'); };
  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-2xl border border-white/10 bg-black/25 p-3" aria-label={t('acc.title')}>
      {mode === 'link' && <p className="text-[12px] text-stone-300">{t('acc.guest')}</p>}
      <label className="relative block">
        <Mail size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('acc.email')} aria-label={t('acc.email')}
          className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-[14px] text-stone-100 outline-none focus:border-amber-300/60" />
      </label>
      <input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('acc.password')} aria-label={t('acc.password')}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-[14px] text-stone-100 outline-none focus:border-amber-300/60" />
      <div className={`grid gap-2 ${mode === 'link' ? 'grid-cols-2' : ''}`}>
        <button type="submit" disabled={!valid || busy} className="flex h-11 touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#FCE38A] to-[#D4AF37] text-[13px] font-extrabold text-[#2a1d02] active:scale-95 disabled:opacity-40">
          <LogIn size={15} aria-hidden /> {busy ? t('acc.wait') : mode === 'signin' ? t('acc.signIn') : t('acc.link')}
        </button>
        {mode === 'link' && (
          <button type="button" disabled={!valid || busy} onClick={() => { void run('signIn'); }} className="h-11 touch-manipulation rounded-xl border border-white/10 bg-white/5 text-[13px] font-bold text-stone-200 active:scale-95 disabled:opacity-40">{t('acc.signIn')}</button>
        )}
      </div>
      <button type="button" disabled={busy} onClick={() => { void run('google'); }} className="h-11 touch-manipulation rounded-xl border border-white/15 bg-white/10 text-[13px] font-bold text-stone-100 active:scale-95 disabled:opacity-40">{t('acc.google')}</button>
      {msg && <p role="status" className={`text-center text-[12px] font-bold ${msg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{msg.text}</p>}
    </form>
  );
}
