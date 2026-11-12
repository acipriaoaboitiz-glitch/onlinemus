import { useState } from 'react';
import { motion } from 'framer-motion';
import type { RoomConfig } from '@mus/engine';
import { CardFace } from '../components/CardFace.tsx';
import { ConfigForm, configSummary } from '../components/ConfigForm.tsx';
import { LogoMus } from '../components/LogoMus.tsx';
import { RulesSheet } from '../components/RulesSheet.tsx';
import { Button, Sheet } from '../components/ui.tsx';
import { useBackend } from '../lib/backendContext.tsx';
import { useInstall } from '../lib/install.ts';
import { CONFIG_KEY, NAME_KEY, loadConfig, saveConfig } from '../lib/prefs.ts';
import { navigate } from '../lib/router.ts';
import { store } from '../lib/storage.ts';
import { toast } from '../lib/toast.ts';

export function Home({ initialCode }: { initialCode?: string }) {
  const { backend, loading } = useBackend();
  const [name, setName] = useState(() => store.get(NAME_KEY) ?? '');
  const [code, setCode] = useState(initialCode ?? '');
  const [config, setConfig] = useState<RoomConfig>(loadConfig);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [rules, setRules] = useState(false);
  const [busy, setBusy] = useState<null | 'create' | 'join'>(null);
  const [iosSheet, setIosSheet] = useState(false);
  const installer = useInstall();

  const nameOk = name.trim().length >= 2;
  const online = backend !== null;

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

  return (
    <main className="home relative isolate">
      <nav className="home__navbar" aria-label="Navegación principal">
        <LogoMus iconClassName="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem]" />
        <span className="home__nav-tag">2 VS 2 <i /> ONLINE</span>
      </nav>
      <header className="home__hero">
        <span className="home__eyebrow">EL JUEGO DE SIEMPRE, EN TU MESA</span>
        <h1>
          <span className="home__headline-accent bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text font-serif text-transparent drop-shadow-[0_4px_22px_rgba(245,158,11,0.22)]">
            La mesa<br />está puesta.
          </span>
        </h1>
        <p>Reúne a tu pareja, prepara los envites<br className="home__desktop-break" /> y que empiece la partida.</p>
        <div className="home__features" aria-label="Características">
          <span>2 contra 2</span>
          <span>En tiempo real</span>
          <span>Con amigos o bots</span>
        </div>
        <div className="home__art" aria-hidden="true">
          <div className="home__art-card home__art-card--back drop-shadow-2xl"><CardFace card={{ id: 'e7', rank: 7, suit: 'espadas' }} /></div>
          <div className="home__art-card home__art-card--left drop-shadow-2xl"><CardFace card={{ id: 'c12', rank: 12, suit: 'copas' }} /></div>
          <div className="home__art-card home__art-card--right drop-shadow-2xl"><CardFace card={{ id: 'o1', rank: 1, suit: 'oros' }} /></div>
          <span className="home__art-chip home__art-chip--one">5</span>
          <span className="home__art-chip home__art-chip--two">1</span>
          <span className="home__art-spark">✦</span>
        </div>
      </header>

      <motion.section className="panel !border-amber-500/10 !bg-zinc-950/60 backdrop-blur-md shadow-[0_24px_70px_rgba(0,0,0,.42)] motion-safe:transition-transform" initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}>
        <div className="panel__head">
          <div>
            <span className="panel__eyebrow">PARTIDA ONLINE</span>
            <h2>Crea una mesa privada</h2>
            <p>Invita a tus amigos con un código.</p>
          </div>
          <span className={`connection${online ? ' connection--on' : loading ? ' connection--loading' : ''}`}>
            <i />
            {loading ? 'Conectando' : online ? 'Disponible' : 'Sin conexión'}
          </span>
        </div>
        <label className="field">
          <span>Tu nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="Cómo te llamamos en la mesa"
            autoComplete="nickname"
            maxLength={20}
          />
        </label>
        <Button
          variant="primary"
          block
          className="home__create !border-amber-400/40 !bg-gradient-to-r !from-amber-600 !via-yellow-500 !to-amber-600 !text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:!shadow-[0_0_24px_rgba(245,158,11,0.35)]"
          disabled={!online || !nameOk || busy !== null}
          onClick={() => void enter('create')}
        >
          {busy === 'create' ? 'Creando sala…' : 'Crear sala'}
        </Button>
        <div className="join">
          <input
            className="code-input"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Código"
            aria-label="Código de la sala"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <Button disabled={!online || !nameOk || code.length < 4 || busy !== null} onClick={() => void enter('join')}>
            {busy === 'join' ? 'Entrando…' : 'Entrar'}
          </Button>
        </div>
        {!online && !loading && (
          <p className="note">El modo online necesita conectar Supabase (mira el README). Mientras tanto puedes jugar contra bots.</p>
        )}
      </motion.section>

      <div className="home__or"><span>O JUEGA POR TU CUENTA</span></div>
      <motion.button type="button" className="btn btn--secondary btn--block home__bots !border-amber-500/10 !bg-zinc-950/60 backdrop-blur-md focus-visible:ring-2 focus-visible:ring-amber-300"
        whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => { remember(); navigate('/local'); }}>
        <span className="home__bot-mark" aria-hidden="true">♟</span>
        <span>Jugar contra bots<small>Sin conexión, cuando quieras</small></span>
        <span className="home__arrow" aria-hidden="true">→</span>
      </motion.button>

      <div className="home__links">
        <button type="button" onClick={() => setCfgOpen(true)}>
          <span className="home__link-mark" aria-hidden="true">01</span>
          <b>Ajustes de partida</b>
          <small>{configSummary(config)}</small>
        </button>
        <button type="button" onClick={() => setRules(true)}>
          <span className="home__link-mark" aria-hidden="true">02</span>
          <b>Reglas</b><small>Cómo se puntúa</small>
        </button>
        {installer.canInstall && (
          <button type="button" onClick={() => void installer.install()}>
            <span className="home__link-mark" aria-hidden="true">↓</span>
            <b>Instalar la app</b><small>Un acceso directo en tu dispositivo</small>
          </button>
        )}
        {!installer.canInstall && installer.iosHint && (
          <button type="button" onClick={() => setIosSheet(true)}>
            <span className="home__link-mark" aria-hidden="true">↓</span>
            <b>Instalar en el iPhone</b><small>Añadir a la pantalla de inicio</small>
          </button>
        )}
      </div>

      <Sheet open={cfgOpen} onClose={() => setCfgOpen(false)} title="Ajustes de partida">
        <ConfigForm value={config} onChange={(c) => { setConfig(c); saveConfig(c); }} />
        <Button variant="primary" block onClick={() => setCfgOpen(false)}>Listo</Button>
      </Sheet>
      <Sheet open={iosSheet} onClose={() => setIosSheet(false)} title="Instalar en iPhone o iPad">
        <p className="sheet__note">En Safari: toca <b>Compartir</b> (el cuadrado con la flecha) y elige <b>Añadir a pantalla de inicio</b>. Se abrirá como una app, sin barras del navegador.</p>
        <Button variant="primary" block onClick={() => setIosSheet(false)}>Entendido</Button>
      </Sheet>
      <RulesSheet open={rules} onClose={() => setRules(false)} eightKings={config.eightKings} />
    </main>
  );
}

export { CONFIG_KEY };
