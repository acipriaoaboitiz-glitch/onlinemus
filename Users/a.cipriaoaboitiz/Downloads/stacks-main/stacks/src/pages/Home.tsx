import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Gem, Globe, Play, Trophy, Users, X } from 'lucide-react';
import { Portal } from '../components/ui/Portal.tsx';
import { GameArt } from '../components/cards/GameArt.tsx';
import { OnlineLobbyModal } from '../components/online/OnlineLobbyModal.tsx';
import { IconBtn, QuickButtons } from '../components/ui/QuickButtons.tsx';
import { FriendsDrawer } from '../components/ui/FriendsDrawer.tsx';
import { LeaderboardModal } from '../components/ui/LeaderboardModal.tsx';
import { VipShopModal } from '../components/ui/VipShopModal.tsx';
import { createRoom, getActiveRoom, setActiveRoom } from '../services/multiplayer.ts';
import { social, useSocial, type Friend } from '../store/social.ts';
import { canClaimDaily, useWallet } from '../store/wallet.ts';
import { claimableMissions, useMissions } from '../store/progression.ts';
import { ChipBalance } from '../components/ui/Hud.tsx';
import { Wordmark } from '../components/ui/Logo.tsx';
import { EconomyModal } from '../components/ui/EconomyModal.tsx';
import { RulesModal } from '../components/ui/RulesModal.tsx';
import { ProfileCard } from '../components/ui/ProfileModal.tsx';
import { Segmented, SettingsModal } from '../components/ui/SettingsModal.tsx';
import { GAMES, findGame, type GameCategory, type GameInfo } from '../games/registry.ts';
import { useT } from '../i18n/index.ts';
import type { Room } from '../services/multiplayer.ts';
import { feedback } from '../store/settings.ts';
import { useBackClose } from '../services/backStack.ts';

/** Secciones del lobby (el orden es el de la barra). */
const CATS: { id: 'all' | GameCategory; key: string }[] = [
  { id: 'all', key: 'cat.all' }, { id: 'espanola', key: 'cat.es' }, { id: 'casino', key: 'cat.casino' }, { id: 'mesa', key: 'cat.mesa' }, { id: 'logica', key: 'cat.logic' },
];

/** Polvo dorado del fondo: posiciones fijas, animación CSS (transform/opacity), sin JS por fotograma. */
const DUST = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 37 + 11) % 96 + 2, size: 3 + (i % 4), dur: 16 + (i * 7) % 12, delay: -((i * 5) % 18), dx: ((i * 23) % 40) - 20, o: 0.35 + (i % 4) * 0.12,
}));

/** Tarjeta del carrusel: foco de luz, medallón dorado y emblema. Estática (sin animaciones infinitas) para mantener 60 FPS en móvil. */
const Slide = memo(function Slide({ game }: { game: GameInfo; active: boolean }) {
  const t = useT();
  const [c1, c2] = game.tint;
  return (
    <div className="relative grid h-full w-full content-between overflow-hidden rounded-[28px] p-4"
      style={{ background: `radial-gradient(ellipse at 50% -4%, rgba(255,236,190,.24), transparent 52%), radial-gradient(ellipse at 50% 40%, ${game.accent}40, transparent 62%), linear-gradient(160deg, ${c1}, ${c2} 85%)`, border: '1px solid rgba(255,255,255,0.08)' }}>
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/3 rounded-t-[28px]" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,0))' }} />
      <span className="font-mono relative z-10 flex w-fit items-center gap-1 rounded-full px-2.5 py-[3px] text-[11px]" style={{ background: '#000a', color: game.accent, border: `1px solid ${game.accent}55` }}>
        <Users size={11} aria-hidden /> {t(`g.${game.id}.pl`)}
      </span>
      <div className="relative z-10 grid origin-center place-items-center lg:scale-[1.08] xl:scale-[1.2]">
        <svg aria-hidden viewBox="0 0 200 200" shapeRendering="geometricPrecision" className="absolute size-[214px]" style={{ opacity: 0.9 }}>
          <defs><linearGradient id={`mg-${game.id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3b0" /><stop offset=".5" stopColor={game.accent} /><stop offset="1" stopColor="#7a4a06" /></linearGradient></defs>
          <circle cx="100" cy="100" r="92" fill="rgba(0,0,0,.34)" stroke={`url(#mg-${game.id})`} strokeWidth="3" />
          <circle cx="100" cy="100" r="82" fill="none" stroke={`url(#mg-${game.id})`} strokeWidth="1.5" strokeDasharray="2 7" />
          <circle cx="100" cy="100" r="72" fill="none" stroke={game.accent} strokeWidth=".8" opacity=".5" />
        </svg>
        <GameArt id={game.id} size={176} />
      </div>
      <div className="relative z-10">
        <h3 className="gold-text font-[var(--font-display)] text-[28px] font-bold leading-none">{t(`g.${game.id}.name`)}</h3>
        <p className="mt-1 text-[12px] text-stone-300/80">{t(`g.${game.id}.tag`)}</p>
      </div>
    </div>
  );
});

function RulesPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (g: GameInfo) => void }) {
  const t = useT();
  useBackClose(open, onClose);
  return (
    <Portal><AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={t('lobby.rulesPick')} className="glass-panel w-full max-w-md rounded-t-3xl p-5"
            style={{ paddingBottom: 'calc(20px + var(--safe-b))' }} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center">
              <h2 className="flex-1 font-[var(--font-display)] text-xl font-bold text-amber-300">{t('lobby.rulesPick')}</h2>
              <button type="button" onClick={onClose} aria-label="×" className="grid size-9 place-items-center rounded-full bg-white/10"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {GAMES.map((g) => (
                <motion.button key={g.id} type="button" whileTap={{ scale: 0.95 }} onClick={() => onPick(g)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5 text-left text-[13px] font-bold">
                  <g.icon size={18} style={{ color: g.accent }} /> {t(`g.${g.id}.name`)}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence></Portal>
  );
}

export default function Home() {
  const nav = useNavigate();
  const t = useT();
  const [params, setParams] = useSearchParams();
  const linkCode = params.get('join') ?? params.get('sala') ?? params.get('room');
  const [online, setOnline] = useState<GameInfo | null>(() => (linkCode ? findGame(params.get('game') ?? 'mus') ?? null : null));
  const [inviteCode, setInviteCode] = useState<string | undefined>(() => linkCode ?? undefined);
  const [settings, setSettings] = useState(false);
  const [showRefill, setShowRefill] = useState(false);
  const [picker, setPicker] = useState(false);
  const [rules, setRules] = useState<GameInfo | null>(null);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [hostRoom, setHostRoom] = useState<Room | null>(null);
  const soc = useSocial();
  const wal = useWallet();
  const missions = useMissions();
  const online$ = soc.peers.length;
  const friendsOnline = soc.friends.filter((f) => soc.peers.some((p) => p.uid === f.uid)).length;
  const chestReady = canClaimDaily(wal) || claimableMissions(missions) > 0;

  // Un enlace `?join=CODIGO` (o una invitación aceptada con la app ya abierta) abre la sala sin pasos intermedios.
  useEffect(() => {
    if (!linkCode) return;
    const g = findGame(params.get('game') ?? 'mus');
    if (g) { setOnline(g); setInviteCode(linkCode); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkCode]);
  // Cofre diario: la primera vez que entras cada día se abre solo (una vez por sesión).
  useEffect(() => {
    try { if (canClaimDaily() && !sessionStorage.getItem('stacks.chestShown')) { sessionStorage.setItem('stacks.chestShown', '1'); setShowRefill(true); } } catch { /* sin sessionStorage */ }
  }, []);
  // Invitar a un amigo: usa la sala activa o crea una privada del juego seleccionado y te lleva a ella.
  const inviteFriend = async (f: Friend) => {
    const g = game;
    let room = getActiveRoom();
    if (!room) {
      try { room = await createRoom(g.id, wal.name); setActiveRoom(room); } catch { return; }
    }
    social.invite(f.uid, room.gameId, room.code);
    const rg = findGame(room.gameId) ?? g;
    setHostRoom(room); setOnline(rg); setFriendsOpen(false);
  };

  const startOnline = (room: Room) => {
    const g = findGame(room.gameId)!;
    setOnline(null);
    nav(`${g.route}?room=${room.code}`);
  };
  const closeOnline = () => {
    setOnline(null);
    setInviteCode(undefined);
    if (params.has('room') || params.has('sala') || params.has('join')) { params.delete('room'); params.delete('sala'); params.delete('join'); params.delete('game'); setParams(params, { replace: true }); }
  };

  const [modes, setModes] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem('stacks.modes') ?? '{}') as Record<string, string>; } catch { return {}; } });
  const pickMode = (id: string, m: string): void => { setModes((cur) => { const n = { ...cur, [id]: m }; try { localStorage.setItem('stacks.modes', JSON.stringify(n)); } catch { /* sin almacenamiento */ } return n; }); };
  const [cat, setCat] = useState<'all' | GameCategory>('all');
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    tabsRef.current?.querySelector<HTMLElement>(`[data-cat="${cat}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [cat]);
  const LIST = useMemo(() => (cat === 'all' ? GAMES : GAMES.filter((g) => g.category === cat)), [cat]);
  const N = LIST.length;
  const [cur, setCur] = useState(0);
  const curRef = useRef(0);
  curRef.current = cur;
  const game = LIST[Math.min(cur, N - 1)]!;
  const scroller = useRef<HTMLDivElement>(null);
  /** Distancia entre el centro de una tarjeta y la siguiente (ancho + hueco). */
  const stepOf = (el: HTMLDivElement): number => {
    const a = el.children[0] as HTMLElement | undefined;
    const b = el.children[1] as HTMLElement | undefined;
    return a && b ? b.offsetLeft - a.offsetLeft : el.clientWidth;
  };
  // El scroll nativo con snap lo gestiona el navegador (GPU); aquí solo se averigua qué tarjeta queda centrada.
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  /** Efecto de profundidad tipo anillo: giro, escala y brillo según la distancia al centro. Solo transform/opacity, sin re-render. */
  const applyFx = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const step = stepOf(el);
    const pos = el.scrollLeft / step;
    cards.current.forEach((c, i) => {
      if (!c) return;
      const d = Math.max(-2, Math.min(2, i - pos));
      const a = Math.abs(d);
      c.style.transform = `perspective(900px) translateZ(${-a * 70}px) rotateY(${-d * 38}deg) scale(${1 - a * 0.06})`;
      c.style.opacity = String(Math.max(0.25, 1 - a * 0.32));
      c.style.zIndex = String(10 - Math.round(a));
    });
  }, []);
  useEffect(() => {
    setCur(0);
    const el = scroller.current;
    if (el) el.scrollTo({ left: 0, behavior: 'auto' });
    applyFx();
  }, [cat, applyFx]);
  useEffect(() => { applyFx(); window.addEventListener('resize', applyFx); return () => window.removeEventListener('resize', applyFx); }, [applyFx]);
  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    applyFx();
    const i = Math.max(0, Math.min(N - 1, Math.round(el.scrollLeft / stepOf(el))));
    setCur((c) => (c === i ? c : i));
  }, [N, applyFx]);
  const goTo = useCallback((i: number) => {
    const el = scroller.current;
    if (!el) return;
    const k = ((i % N) + N) % N;
    el.scrollTo({ left: k * stepOf(el), behavior: 'smooth' });
  }, [N]);
  const badge = (n: number, tone: string) => (n > 0 ? <span className={`pointer-events-none absolute -right-1 -top-1 grid min-w-[16px] place-items-center rounded-full px-1 text-[10px] font-extrabold leading-4 tabular-nums text-white ${tone}`}>{n}</span> : null);
  const friendsBtn = (
    <span className="relative">
      <IconBtn label={t('soc.title')} onClick={() => setFriendsOpen(true)}><Users size={17} /></IconBtn>
      {badge(soc.incoming.length, 'bg-red-600')}
      {soc.incoming.length === 0 && friendsOnline > 0 && badge(friendsOnline, 'bg-emerald-600')}
    </span>
  );
  const boardBtn = <IconBtn label={t('lb.title')} onClick={() => setBoardOpen(true)}><Trophy size={17} /></IconBtn>;
  const shopBtn = <IconBtn label={t('vip.title')} onClick={() => setShopOpen(true)}><Gem size={17} /></IconBtn>;
  void online$;

  return (
    <div className="screen obsidian">
      <header className="glass-panel relative z-20 w-full shrink-0 overflow-hidden" style={{ borderWidth: '0 0 1px 0', borderRadius: 0 }}>
        <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:px-6">
        <div className="col-start-1 row-start-1 min-w-0 max-w-[200px] justify-self-start sm:max-w-[240px]"><ProfileCard /></div>
        {/* Fila central: STACKS siempre en el centro exacto (columnas 1fr · auto · 1fr); en móvil, a sus lados van Amigos/Ranking y Club VIP */}
        <div className="col-span-2 row-start-2 grid grid-cols-[1fr_auto_1fr] items-center sm:col-span-1 sm:col-start-2 sm:row-start-1">
          <div className="flex items-center justify-start gap-1.5 sm:hidden">{friendsBtn}{boardBtn}</div>
          <h1 aria-label="STACKS"><Wordmark size={20} /></h1>
          <div className="flex items-center justify-end gap-1.5 sm:hidden">{shopBtn}</div>
        </div>
        <div className="col-start-2 row-start-1 flex min-w-0 shrink-0 items-center gap-1 justify-self-end sm:col-start-3 sm:gap-2">
          <span className="hidden items-center gap-1.5 sm:flex">{friendsBtn}{boardBtn}{shopBtn}</span>
          <ChipBalance onPlus={() => setShowRefill(true)} alert={chestReady} />
          <QuickButtons onRules={() => setPicker(true)} onSettings={() => setSettings(true)} />
        </div>
        </div>
      </header>
      <EconomyModal open={showRefill} onClose={() => setShowRefill(false)} />
      <FriendsDrawer open={friendsOpen} onClose={() => setFriendsOpen(false)} onInvite={(f) => { void inviteFriend(f); }} />
      <LeaderboardModal open={boardOpen} onClose={() => setBoardOpen(false)} />
      <VipShopModal open={shopOpen} onClose={() => setShopOpen(false)} />

      {/* Barra de secciones con selector deslizante */}
      <div className="relative z-20 flex w-full justify-center px-2 pt-3"><div ref={tabsRef} role="tablist" aria-label="Secciones" className="no-scrollbar inline-flex w-auto max-w-[96vw] items-center justify-center gap-1 rounded-full max-md:justify-start max-md:overflow-x-auto border border-white/10 bg-[#081711] p-1.5">
        {CATS.map((c) => (
          <button key={c.id} type="button" role="tab" data-cat={c.id} aria-selected={cat === c.id} onClick={() => { if (cat !== c.id) { feedback('tap'); setCat(c.id); } }}
            className={`relative shrink-0 touch-manipulation whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold transition-colors lg:px-5 lg:py-2 lg:text-sm ${cat === c.id ? 'text-[#2a1d02]' : 'text-white/55 active:text-white'}`}>
            {cat === c.id && <motion.span layoutId="lobby-category" aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-b from-[#FCE38A] to-[#D4AF37] shadow-[0_2px_10px_rgba(212,175,55,.35)]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative">{t(c.key)}</span>
          </button>
        ))}
      </div></div>

      <div className="desk-zoom relative mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col items-center justify-between overflow-hidden px-4 pt-3" style={{ paddingBottom: 'calc(14px + var(--safe-b))' }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 transition-[background] duration-300" style={{ background: `radial-gradient(ellipse at 50% 38%, ${game.accent}33, transparent 62%)` }} />

        {/* polvo dorado flotando muy despacio */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {DUST.map((d, i) => <span key={i} className="dust" style={{ left: `${d.left}%`, width: d.size, height: d.size, ['--dur' as string]: `${d.dur}s`, ['--delay' as string]: `${d.delay}s`, ['--dx' as string]: `${d.dx}px`, ['--o' as string]: d.o }} />)}
        </div>

        <div aria-hidden />

        {/* Carrusel nativo: scroll horizontal con snap (sin JS por frame) */}
        <motion.div key={cat} className="relative z-10 h-[min(40dvh,360px)] w-full lg:h-[calc(min(450px,52dvh)/var(--z,1))] xl:h-[calc(min(490px,56dvh)/var(--z,1))]" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
          <div ref={scroller} onScroll={onScroll} role="group" aria-label="Juegos"
            className="no-scrollbar flex h-full snap-x snap-mandatory items-center gap-1 overflow-x-auto scroll-smooth px-[calc(50%-min(31vw,120px))] touch-pan-x [overscroll-behavior-x:contain] lg:gap-3 lg:px-[calc(50%-calc(190px/var(--z,1)))] xl:px-[calc(50%-calc(210px/var(--z,1)))]">
            {LIST.map((g, i) => (
              <div key={g.id} ref={(n) => { cards.current[i] = n; }}
                className="relative h-[94%] w-[min(62vw,240px)] shrink-0 snap-center will-change-transform lg:h-[calc(min(430px,50dvh)/var(--z,1))] lg:w-[calc(380px/var(--z,1))] xl:h-[calc(min(470px,54dvh)/var(--z,1))] xl:w-[calc(420px/var(--z,1))]"
                role="group" aria-label={t(`g.${g.id}.name`)} aria-current={i === cur} onClick={() => { if (i !== cur) { feedback('tap'); goTo(i); } }}>
                <motion.div whileHover={i === cur ? { y: -6 } : undefined} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className={`group relative h-full w-full overflow-hidden rounded-[28px] border border-transparent transition-[box-shadow,border-color] duration-200 ${i === cur ? 'hover:border-[#D4AF37]/70' : ''}`}
                  style={{ boxShadow: i === cur ? `0 0 0 1px ${g.accent}aa, 0 14px 34px rgba(0,0,0,.55), 0 0 30px ${g.accent}44` : '0 8px 18px rgba(0,0,0,.5)' }}>
                  <Slide game={g} active={i === cur} />
                  {i === cur && <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:translate-x-[340%] group-hover:opacity-100 transition-[transform,opacity] duration-700 ease-out" />}
                </motion.div>
                {/* brillo de cristal sobre la tarjeta activa */}
                {i === cur && <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[28px]" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,0) 38%, rgba(255,255,255,0) 70%, rgba(255,255,255,.07) 100%)' }} />}
              </div>
            ))}
          </div>
          <button type="button" aria-label="←" onClick={() => goTo(curRef.current - 1)} className="absolute left-0 top-1/2 z-20 grid size-9 -translate-y-1/2 touch-manipulation place-items-center rounded-full border border-amber-200/20 bg-black/70 text-stone-100"><ChevronLeft size={18} /></button>
          <button type="button" aria-label="→" onClick={() => goTo(curRef.current + 1)} className="absolute right-0 top-1/2 z-20 grid size-9 -translate-y-1/2 touch-manipulation place-items-center rounded-full border border-amber-200/20 bg-black/70 text-stone-100"><ChevronRight size={18} /></button>
        </motion.div>

        {/* Acciones del juego elegido: multijugador (IA o sala) o individual (modo + Jugar ahora) */}
        <div className="relative z-10 grid w-full max-w-sm gap-2 lg:max-w-[calc(380px/var(--z,1))] xl:max-w-[calc(420px/var(--z,1))]">
          {game.solo ? (
            <>
              <Segmented value={modes[game.id] && game.solo.modes.includes(modes[game.id]!) ? modes[game.id]! : game.solo.def}
                options={game.solo.modes.map((m) => ({ id: m, label: t(`mode.${m}`) }))} onChange={(m) => pickMode(game.id, m)} label={t('mode.title')} />
              <button type="button"
                className="gold-foil flex min-h-14 touch-manipulation active:scale-95 items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold" onClick={() => { feedback('tap'); nav(`${game.route}?mode=${modes[game.id] && game.solo!.modes.includes(modes[game.id]!) ? modes[game.id] : game.solo!.def}`); }}>
                <Play size={17} aria-hidden /> {t('lobby.playNow')}
              </button>
            </>
          ) : (
            <>
              <button type="button"
                className="gold-foil flex min-h-14 touch-manipulation active:scale-95 items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold" onClick={() => { feedback('tap'); nav(game.route); }}>
                <Play size={17} aria-hidden /> {t('lobby.playAi')}
              </button>
              <button type="button"
                className="flex min-h-12 touch-manipulation active:scale-95 items-center justify-center gap-2 rounded-2xl border border-amber-200/25 bg-gradient-to-b from-zinc-800/90 to-zinc-950/90 text-[14px] font-bold text-stone-100 shadow-[inset_0_1px_rgba(255,255,255,.1)]"
                onClick={() => { feedback('tap'); setOnline(game); }}>
                <Globe size={16} aria-hidden /> {t('lobby.online')}
              </button>
            </>
          )}
        </div>
      </div>

      <OnlineLobbyModal game={online} initialCode={inviteCode} existing={hostRoom} onClose={() => { setHostRoom(null); closeOnline(); }} onStart={startOnline} />
      <RulesPicker open={picker} onClose={() => setPicker(false)} onPick={(g) => { setPicker(false); setRules(g); }} />
      <RulesModal game={rules} onClose={() => setRules(null)} />
      <SettingsModal open={settings} onClose={() => setSettings(false)} />
    </div>
  );
}
