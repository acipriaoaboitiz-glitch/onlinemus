import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { RoomConfig } from '@mus/engine';
import { CardFace } from '../components/CardFace.tsx';
import { ConfigForm, configSummary } from '../components/ConfigForm.tsx';
import { IconBook, IconBot, IconChevronRight, IconDownload, IconInfo, IconSliders, IconUsers } from '../components/icons.tsx';
import { LogoMus } from '../components/LogoMus.tsx';
import { Manual } from '../components/Manual.tsx';
import type { ManualTab } from '../components/Manual.tsx';
import { SettingsButton } from '../components/SettingsModal.tsx';
import { Button, Sheet } from '../components/ui.tsx';
import { useBackend } from '../lib/backendContext.tsx';
import { useInstall } from '../lib/install.ts';
import { CONFIG_KEY, NAME_KEY, loadConfig, saveConfig } from '../lib/prefs.ts';
import { navigate } from '../lib/router.ts';
import { store } from '../lib/storage.ts';
import { toast } from '../lib/toast.ts';

const INPUT =
  'h-[clamp(34px,calc(var(--u)*6.2),48px)] w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-[16px] text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20 disabled:opacity-50';

/** Hueco de una carta del abanico decorativo. */
function FanCard({ children, className }: { children: ReactNode; className: string }) {
  return (
    <div className={`absolute aspect-[12/19] w-[clamp(50px,14.5vw,78px)] overflow-hidden rounded-[7px] shadow-[0_14px_30px_rgba(0,0,0,.6)] ring-1 ring-black/30 ${className}`}>
      {children}
    </div>
  );
}

function Tile({ icon, title, hint, onClick }: { icon: ReactNode; title: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-col items-center gap-0.5 rounded-2xl border border-white/10 bg-white/[.04] px-2 py-[clamp(4px,calc(var(--u)*1.2),10px)] text-center transition hover:bg-white/[.07] active:scale-[.97]"
    >
      <span className="text-amber-300">{icon}</span>
      <b className="text-[13px] text-stone-100">{title}</b>
      <small className="max-w-full truncate text-[10.5px] text-stone-500 [@media(max-height:620px)]:hidden">{hint}</small>
    </button>
  );
}

/**
 * Portada. Cabe SIEMPRE en una pantalla (h-[100dvh]): el héroe es la única pieza elástica y se encoge o desaparece
 * en pantallas bajas; si aun así no cupiera (móvil en horizontal) el contenido se desplaza dentro de la propia portada.
 */
export function Home({ initialCode }: { initialCode?: string }) {
  const { backend, loading } = useBackend();
  const [name, setName] = useState(() => store.get(NAME_KEY) ?? '');
  const [code, setCode] = useState(initialCode ?? '');
  const [config, setConfig] = useState<RoomConfig>(loadConfig);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [manual, setManual] = useState<ManualTab | null>(null);
  const [busy, setBusy] = useState<null | 'create' | 'join'>(null);
  const [iosSheet, setIosSheet] = useState(false);
  const installer = useInstall();

  const nameOk = name.trim().length >= 2;
  const online = backend !== null;
  const canInstallHere = installer.canInstall || installer.iosHint;

  const remember = () => {
    store.set(NAME_KEY, name.trim());
    saveConfig(config);
  };

  async function enter(kind: 'create' | 'join') {
    if (!backend || !nameOk) return;
    setBusy(kind);
    try {
      remember();
      await backend.ensureUser(name.trim());
      const room = kind === 'create' ? await backend.createRoom(config) : await backend.joinRoom(code);
      navigate(`/room/${room.roomId}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se ha podido entrar en la sala', 'error');
    } finally {
      setBusy(null);
    }
  }

  const pill = online
    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
    : loading ? 'border-amber-300/30 bg-amber-300/10 text-amber-200' : 'border-rose-400/30 bg-rose-400/10 text-rose-300';

  return (
    <>
    {/* Raíz: ocupa justo el alto visible (dvh) y reparte cabecera · héroe · tarjetas; el relleno respeta notch y barra de inicio. */}
    <main style={{ '--u': 'calc((100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom)) / 100)' } as CSSProperties} className="relative isolate mx-auto flex min-h-[100dvh] w-full max-w-[460px] flex-col justify-between md:max-w-[560px] gap-2 [@media(max-height:600px)]:gap-0 px-[clamp(16px,5vw,28px)] pb-[calc(env(safe-area-inset-bottom)+20px)] pt-[calc(env(safe-area-inset-top)+16px)] text-stone-100">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_70%_38%_at_88%_6%,rgba(240,195,95,.17),transparent_70%),radial-gradient(ellipse_90%_45%_at_5%_100%,rgba(18,98,76,.38),transparent_70%)]" />

        {/* Barra superior: espaciador 44px · logo y título centrados · ajustes 44px */}
        <nav className="grid w-full grid-cols-[44px_1fr_44px] items-center" aria-label="Navegación principal">
          <span aria-hidden="true" />
          <div className="justify-self-center">
            <LogoMus tagline={false} iconClassName="size-[clamp(42px,calc(var(--u)*9),92px)]" />
          </div>
          <div className="justify-self-end"><SettingsButton /></div>
        </nav>

        {/* Héroe: centrado en el hueco que queda entre la cabecera y las tarjetas */}
        <header className="relative my-auto flex min-h-[56px] flex-col justify-center">
          <motion.div className="relative z-10 grid max-w-[57%] gap-1.5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
            <span className="text-[10px] font-extrabold uppercase tracking-[.26em] text-amber-300/80 [@media(max-height:620px)]:hidden">2 contra 2 · Online</span>
            <h1 className="bg-gradient-to-b from-amber-100 via-yellow-400 to-amber-600 bg-clip-text font-[var(--font-display)] text-[clamp(28px,min(8.4vw,calc(var(--u)*5.4)),48px)] font-bold leading-[.98] text-transparent drop-shadow-[0_4px_22px_rgba(245,158,11,.2)]">
              La mesa<br />está puesta.
            </h1>
            <p className="text-[clamp(12px,3.5vw,15px)] leading-snug text-stone-400 hidden [@media(min-height:800px)]:block">
              Reúne a tu pareja, prepara los envites y que empiece la partida.
            </p>
            <div className="mt-1.5 hidden flex-wrap gap-1.5 [@media(min-height:890px)]:flex" aria-label="Características">
              {['2 contra 2', 'Tiempo real', 'Con amigos o bots'].map((t) => (
                <span key={t} className="rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-[11px] font-semibold text-stone-300">{t}</span>
              ))}
            </div>
          </motion.div>
          <div aria-hidden="true" className="pointer-events-none absolute -right-1 top-1/2 h-[min(100%,190px)] w-[41%] -translate-y-1/2 [@media(max-height:620px)]:hidden">
            <motion.div className="absolute inset-0" initial={{ opacity: 0, scale: 0.9, rotate: -4 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}>
              <FanCard className="left-[2%] top-[22%] -rotate-[15deg]"><CardFace card={{ id: 'c12', rank: 12, suit: 'copas' }} /></FanCard>
              <FanCard className="left-[26%] top-[4%] rotate-[3deg]"><CardFace card={{ id: 'e7', rank: 7, suit: 'espadas' }} /></FanCard>
              <FanCard className="left-[50%] top-[20%] rotate-[17deg]"><CardFace card={{ id: 'o1', rank: 1, suit: 'oros' }} /></FanCard>
            </motion.div>
          </div>
        </header>

        {/* Tarjetas de juego */}
        <div className="flex flex-col gap-2 [@media(max-height:600px)]:gap-1.5 [@media(min-height:700px)]:gap-4">
        {/* Cómo quieres jugar + manual */}
        <div className="flex items-center justify-between gap-3">
          <span className="whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[.2em] text-amber-200/70 max-[350px]:tracking-[.1em]">Cómo quieres jugar</span>
          <button
            type="button"
            onClick={() => setManual('basico')}
            aria-label="Abrir el manual: cómo se juega al Mus"
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-300/35 bg-amber-300/10 py-1 pl-1.5 pr-3 text-[12px] max-[350px]:text-[11px] font-bold text-amber-200 transition hover:bg-amber-300/20 active:scale-95"
          >
            <span className="text-amber-300"><IconInfo size={20} /></span>
            ¿Cómo se juega?
          </button>
        </div>

        {/* Online */}
        <motion.section
          className="grid gap-[clamp(6px,calc(var(--u)*1.1),10px)] rounded-3xl border border-amber-300/15 bg-zinc-950/65 p-[clamp(10px,calc(var(--u)*1.6),14px)] shadow-[0_24px_70px_rgba(0,0,0,.42)] backdrop-blur-md"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber-300/25 bg-amber-300/10 text-amber-300"><IconUsers /></span>
            <div className="grid min-w-0 flex-1 leading-tight">
              <h2 className="font-[var(--font-display)] text-[18px] font-bold text-stone-50">Partida online</h2>
              <p className="truncate text-[12px] text-stone-400">{online || loading ? 'Crea una mesa privada' : 'Servidor no disponible'}</p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${pill}`}>
              <i className={`size-1.5 rounded-full bg-current ${loading ? 'animate-pulse' : ''}`} />
              {loading ? 'Conectando' : online ? 'Disponible' : 'Sin conexión'}
            </span>
          </div>
          <input
            className={INPUT}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="Tu nombre en la mesa"
            aria-label="Tu nombre"
            autoComplete="nickname"
            maxLength={20}
          />
          <button
            type="button"
            disabled={!online || !nameOk || busy !== null}
            onClick={() => void enter('create')}
            className="h-[clamp(34px,calc(var(--u)*6.2),48px)] w-full rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-[16px] font-extrabold tracking-wide text-amber-950 shadow-[0_8px_24px_rgba(245,158,11,.25)] transition enabled:active:scale-[.98] disabled:opacity-40 disabled:saturate-50"
          >
            {busy === 'create' ? 'Creando sala…' : 'Crear sala'}
          </button>
          <div className="flex items-center gap-2">
            <input
              className={`${INPUT} w-[42%] text-center tracking-[.2em] placeholder:tracking-normal`}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Código"
              aria-label="Código de la sala"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <button
              type="button"
              disabled={!online || !nameOk || code.length < 4 || busy !== null}
              onClick={() => void enter('join')}
              className="h-[clamp(34px,calc(var(--u)*6.2),48px)] flex-1 rounded-2xl border border-white/15 bg-white/[.07] text-[15px] font-bold text-stone-100 transition enabled:hover:bg-white/10 enabled:active:scale-[.98] disabled:opacity-40"
            >
              {busy === 'join' ? 'Entrando…' : 'Entrar'}
            </button>
          </div>
        </motion.section>

        {/* Contra bots */}
        <motion.button
          type="button"
          className="flex h-[clamp(46px,calc(var(--u)*8),66px)] items-center gap-3 rounded-3xl border border-amber-300/15 bg-zinc-950/65 px-4 text-left backdrop-blur-md transition hover:border-amber-300/30"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18, ease: 'easeOut' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { remember(); navigate('/local'); }}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber-300/25 bg-amber-300/10 text-amber-300"><IconBot /></span>
          <span className="grid min-w-0 flex-1 leading-tight">
            <b className="font-[var(--font-display)] text-[18px] text-stone-50">Jugar contra bots</b>
            <small className="text-[12px] text-stone-400">Sin conexión · empieza al instante</small>
          </span>
          <span className="text-amber-300" aria-hidden="true"><IconChevronRight /></span>
        </motion.button>

        {/* Accesos */}
        <div className={`grid gap-2 ${canInstallHere ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <Tile icon={<IconSliders />} title="Ajustes" hint={`${config.targetPoints} piedras · ${config.eightKings ? '8' : '4'} reyes`} onClick={() => setCfgOpen(true)} />
          <Tile icon={<IconBook />} title="Reglas" hint="Manual completo" onClick={() => setManual('puntos')} />
          {installer.canInstall && <Tile icon={<IconDownload />} title="Instalar" hint="Acceso directo" onClick={() => void installer.install()} />}
          {!installer.canInstall && installer.iosHint && <Tile icon={<IconDownload />} title="Instalar" hint="En el iPhone" onClick={() => setIosSheet(true)} />}
        </div>
        </div>
    </main>

      <Sheet open={cfgOpen} onClose={() => setCfgOpen(false)} title="Ajustes de partida">
        <p className="sheet__note">{configSummary(config)}</p>
        <ConfigForm value={config} onChange={(c) => { setConfig(c); saveConfig(c); }} />
        <Button variant="primary" block onClick={() => setCfgOpen(false)}>Listo</Button>
      </Sheet>
      <Sheet open={iosSheet} onClose={() => setIosSheet(false)} title="Instalar en iPhone o iPad">
        <p className="sheet__note">En Safari: toca <b>Compartir</b> (el cuadrado con la flecha) y elige <b>Añadir a pantalla de inicio</b>. Se abrirá como una app, sin barras del navegador.</p>
        <Button variant="primary" block onClick={() => setIosSheet(false)}>Entendido</Button>
      </Sheet>
      <Manual open={manual !== null} onClose={() => setManual(null)} initialTab={manual ?? 'basico'} eightKings={config.eightKings} />
    </>
  );
}

export { CONFIG_KEY };
