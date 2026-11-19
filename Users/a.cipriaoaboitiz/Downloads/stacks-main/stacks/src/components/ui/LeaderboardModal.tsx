import { Portal } from './Portal.tsx';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Medal, Trophy, X } from 'lucide-react';
import { useT } from '../../i18n/index.ts';
import { useIdent } from '../../store/identity.ts';
import { social, useSocial } from '../../store/social.ts';
import { useWallet } from '../../store/wallet.ts';
import type { Card } from '../../services/club.ts';
import { useBackClose } from '../../services/backStack.ts';

type Row = Card & { chips: number; wins: number };
type Tab = 'amigos' | 'global';
type Sort = 'chips' | 'wins';

/** Clasificación del club: «Mis amigos» y «Top global», ordenables por fichas o por victorias, con tu posición resaltada. */
export function LeaderboardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useBackClose(open, onClose);
  const t = useT();
  const me = useIdent();
  const w = useWallet();
  const s = useSocial();
  const [tab, setTab] = useState<Tab>('amigos');
  const [sort, setSort] = useState<Sort>('chips');
  const [global, setGlobal] = useState<{ rows: Row[]; source: 'db' | 'live' } | null>(null);
  const myWins = Object.values(w.wins).reduce((a, b) => a + b, 0);
  const mine: Row = { uid: me.uid, name: me.name, tag: me.tag, avatar: w.avatar, chips: w.chips, wins: myWins };

  useEffect(() => {
    if (!open || tab !== 'global') return;
    let live = true;
    void social.top().then((r) => { if (live) setGlobal(r); });
    return () => { live = false; };
  }, [open, tab, s.peers.length]);

  const rows = useMemo(() => {
    const base: Row[] = tab === 'amigos'
      ? [mine, ...s.friends.map((f) => ({ uid: f.uid, name: f.name, tag: f.tag, avatar: f.avatar, chips: f.chips, wins: f.wins }))]
      : (global?.rows ?? [mine]).map((r) => (r.uid === me.uid ? mine : r));
    return [...base].sort((a, b) => b[sort] - a[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sort, s.friends, global, w.chips, myWins, me.uid, me.name]);

  const myPos = rows.findIndex((r) => r.uid === me.uid) + 1;
  const MEDAL = ['#FCE38A', '#CBD5E1', '#D58A4F'];
  const medal = (i: number): ReactNode => (i < 3 ? <Medal size={16} strokeWidth={1.75} className="mx-auto" style={{ color: MEDAL[i] }} aria-label={String(i + 1)} /> : String(i + 1));
  return (
    <Portal><AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={t('lb.title')}
            className="border border-white/[0.08] bg-[#091511] shadow-2xl w-full max-w-md overflow-y-auto rounded-t-2xl p-4 sm:rounded-2xl" style={{ maxHeight: '92dvh', paddingBottom: 'calc(16px + var(--safe-b))' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <Trophy size={20} className="text-amber-300" aria-hidden />
              <h2 className="flex-1 text-[19px] font-bold tracking-tight text-white">{t('lb.title')}</h2>
              <button type="button" onClick={onClose} aria-label={t('a.close')} className="grid size-9 touch-manipulation place-items-center rounded-xl bg-white/10"><X size={16} /></button>
            </div>
            <div className="mb-2 grid grid-cols-2 gap-2" role="tablist">
              {([['amigos', t('lb.friends')], ['global', t('lb.global')]] as const).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                  className={`h-10 touch-manipulation rounded-xl border text-[13px] font-bold ${tab === id ? 'border-amber-200 bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950' : 'border-white/10 bg-white/5 text-stone-200'}`}>{label}</button>
              ))}
            </div>
            <div className="mb-2 flex items-center justify-between text-[11px] text-stone-400">
              <span>{myPos ? t('lb.pos', { a: myPos, b: rows.length }) : ''}</span>
              <span className="flex gap-1">
                {([['chips', t('lb.chips')], ['wins', t('lb.wins')]] as const).map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setSort(id)} className={`touch-manipulation rounded-full px-2.5 py-1 font-bold ${sort === id ? 'bg-amber-300 text-amber-950' : 'bg-white/10 text-stone-300'}`}>{label}</button>
                ))}
              </span>
            </div>
            <ol className="grid gap-1.5">
              {rows.map((r, i) => {
                const isMe = r.uid === me.uid;
                const online = s.peers.some((p) => p.uid === r.uid);
                return (
                  <li key={r.uid} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isMe ? 'border-amber-300 bg-amber-300/10' : 'border-white/10 bg-white/5'}`}>
                    <span className="w-6 text-center text-[13px] font-extrabold tabular-nums">{medal(i)}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{r.name}<span className="text-amber-200/80">#{r.tag}</span>{isMe ? ` ${t('lb.you')}` : ''}{online && !isMe ? <span aria-label="online" className="ml-1.5 inline-block size-1.5 rounded-full bg-emerald-400 align-middle" /> : null}</span>
                    <span className={`w-16 text-right font-mono text-[13px] font-bold tabular-nums ${sort === 'chips' ? 'text-amber-200' : 'text-stone-300'}`}>{r.chips.toLocaleString('es-ES')}</span>
                    <span className={`w-9 text-right font-mono text-[12px] tabular-nums ${sort === 'wins' ? 'font-bold text-amber-200' : 'text-stone-400'}`}><span className="inline-flex items-center justify-end gap-0.5">{r.wins}<Trophy size={11} strokeWidth={1.75} aria-hidden /></span></span>
                  </li>
                );
              })}
            </ol>
            {tab === 'amigos' && s.friends.length === 0 && <p className="mt-2 text-center text-[12px] text-stone-400">{t('lb.addFriends')}</p>}
            {tab === 'global' && (
              <p className="mt-2 text-center text-[10px] text-stone-500">
                {global?.source === 'db' ? t('lb.srcDb') : t('lb.srcLive')}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence></Portal>
  );
}
