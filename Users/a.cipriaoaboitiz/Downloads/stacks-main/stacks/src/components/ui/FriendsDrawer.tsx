import { Portal } from './Portal.tsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Search, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { findGame } from '../../games/registry.ts';
import { useT } from '../../i18n/index.ts';
import { useIdent } from '../../store/identity.ts';
import { feedback } from '../../store/settings.ts';
import { social, statusLabel, useSocial, type Friend } from '../../store/social.ts';
import type { Card } from '../../services/club.ts';
import { useBackClose } from '../../services/backStack.ts';


/** Hoja de «Amigos»: tu ID con copia a 1 toque, buscador, solicitudes y lista con estado en vivo e «Invitar a jugar». */
export function FriendsDrawer({ open, onClose, onInvite }: { open: boolean; onClose: () => void; onInvite: (f: Friend) => void }) {
  useBackClose(open, onClose);
  const t = useT();
  const gameName = (id: string): string => (findGame(id) ? t(`g.${id}.name`) : t('st.aGame'));
  const me = useIdent();
  const s = useSocial();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Card[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const peersById = useMemo(() => new Map(s.peers.map((p) => [p.uid, p])), [s.peers]);

  useEffect(() => { if (!open) { setQ(''); setResults(null); } }, [open]);
  // Búsqueda con pequeña espera mientras se escribe.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); return; }
    const mine = ++seq.current;
    setBusy(true);
    const t = window.setTimeout(() => { void social.search(term).then((r) => { if (mine === seq.current) { setResults(r); setBusy(false); } }); }, 250);
    return () => window.clearTimeout(t);
  }, [q]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(me.handle); } catch { /* sin permiso de portapapeles */ }
    feedback('chip'); setCopied(true); window.setTimeout(() => setCopied(false), 1600);
  };
  const isFriend = (uid: string) => s.friends.some((f) => f.uid === uid);
  const isPending = (uid: string) => s.outgoing.some((o) => o.uid === uid);

  return (
    <Portal><AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={t('soc.title')}
            className="border border-white/[0.08] bg-[#091511] shadow-2xl w-full max-w-md overflow-y-auto rounded-t-2xl p-4 sm:rounded-2xl" style={{ maxHeight: '92dvh', paddingBottom: 'calc(16px + var(--safe-b))' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <Users size={20} className="text-amber-300" aria-hidden />
              <h2 className="flex-1 text-[19px] font-bold tracking-tight text-white">{t('soc.title')}</h2>
              <button type="button" onClick={onClose} aria-label={t('a.close')} className="grid size-9 touch-manipulation place-items-center rounded-xl bg-white/10"><X size={16} /></button>
            </div>

            {/* Tu ID */}
            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-300/25 bg-black/30 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-amber-200/70">{t('soc.myId')}</p>
                <p className="truncate font-mono text-lg font-bold tabular-nums text-amber-200">{me.handle}</p>
              </div>
              <button type="button" onClick={copy} aria-label={t('soc.copyAria')} className="btn gold-foil flex touch-manipulation items-center gap-1.5" style={{ minHeight: 44, padding: '0 12px', fontSize: 13 }}>
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? t('soc.copied') : t('soc.copy')}
              </button>
            </div>

            {/* Buscador */}
            <label className="relative mb-2 block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('soc.searchPh')} aria-label={t('soc.searchAria')} autoCapitalize="none" autoCorrect="off"
                className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-9 pr-3 text-[14px] text-stone-100 outline-none focus:border-amber-300/60" />
            </label>
            {results !== null && (
              <ul className="mb-3 grid gap-1.5" aria-label={t('soc.results')}>
                {results.length === 0 && <li className="rounded-xl bg-white/5 px-3 py-2 text-[12px] text-stone-400">{busy ? t('soc.searching') : t('soc.noResults')}</li>}
                {results.map((c) => (
                  <li key={c.uid} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold tabular-nums">{c.name}<span className="text-amber-200/80">#{c.tag}</span></span>
                    {isFriend(c.uid) ? <span className="text-[11px] font-bold text-emerald-300">{t('soc.alreadyFriends')}</span>
                      : isPending(c.uid) ? <span className="text-[11px] font-bold text-stone-400">{t('soc.sent')}</span>
                        : <button type="button" onClick={() => { social.request(c); feedback('chip'); }} className="flex min-h-9 touch-manipulation items-center gap-1 rounded-full bg-gradient-to-b from-[#FCE38A] to-[#D4AF37] px-3 text-[12px] font-extrabold text-[#2a1d02] active:scale-95"><UserPlus size={14} aria-hidden /> {t('soc.add')}</button>}
                  </li>
                ))}
              </ul>
            )}

            {/* Solicitudes pendientes */}
            {s.incoming.length > 0 && (
              <section className="mb-3">
                <h3 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[.16em] text-red-300">{t('soc.requests')} ({s.incoming.length})</h3>
                <ul className="grid gap-1.5">
                  {s.incoming.map((c) => (
                    <li key={c.uid} className="flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-950/20 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{c.name}<span className="text-amber-200/80">#{c.tag}</span></span>
                      <button type="button" onClick={() => { social.accept(c.uid); feedback('chip'); }} className="min-h-9 touch-manipulation rounded-full bg-gradient-to-b from-[#FCE38A] to-[#D4AF37] px-3 text-[12px] font-extrabold text-[#2a1d02] active:scale-95">{t('soc.accept')}</button>
                      <button type="button" onClick={() => social.decline(c.uid)} className="min-h-9 touch-manipulation rounded-full bg-white/10 px-3 text-[12px] font-bold text-stone-200 active:scale-95">{t('soc.decline')}</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Lista de amigos */}
            <section>
              <h3 className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-[.14em] text-white/45">
                <span>{t('soc.myFriends')} ({s.friends.length})</span>
                <span className="font-semibold normal-case tracking-normal text-stone-400">{s.friends.filter((f) => peersById.has(f.uid)).length} {t('soc.onlineCount')}</span>
              </h3>
              {s.friends.length === 0 && <p className="rounded-xl bg-white/5 px-3 py-3 text-[12px] text-stone-400">{t('soc.noFriends')}</p>}
              <ul className="grid gap-1.5">
                {s.friends.map((f) => {
                  const p = peersById.get(f.uid);
                  return (
                    <li key={f.uid} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[13px]">{f.name}<span className="text-amber-200/80">#{f.tag}</span></b>
                        <small className="block truncate text-[11px] text-stone-300">{statusLabel(p, gameName, t)}</small>
                      </span>
                      <button type="button" disabled={!p} onClick={() => onInvite(f)}
                        className="min-h-9 touch-manipulation rounded-full bg-gradient-to-b from-[#FCE38A] to-[#D4AF37] px-3 text-[12px] font-extrabold text-[#2a1d02] active:scale-95 disabled:opacity-35">{t('soc.invite')}</button>
                      <button type="button" aria-label={t('soc.remove', { n: f.name })} onClick={() => { if (window.confirm(t('soc.confirmRemove', { n: `${f.name}#${f.tag}` }))) social.remove(f.uid); }}
                        className="grid size-9 touch-manipulation place-items-center rounded-full bg-white/10 text-stone-300 active:scale-95"><UserMinus size={14} aria-hidden /></button>
                    </li>
                  );
                })}
              </ul>
            </section>
            {s.outgoing.length > 0 && <p className="mt-2 text-[11px] text-stone-400">{t('soc.pending')} {s.outgoing.map((o) => `${o.name}#${o.tag}`).join(', ')}</p>}
            <p className="mt-3 text-center text-[10px] text-stone-500">
              {s.transport === 'supabase' ? t('soc.liveSupabase') : s.transport === 'local' ? t('soc.liveLocal') : t('soc.offline')}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence></Portal>
  );
}
