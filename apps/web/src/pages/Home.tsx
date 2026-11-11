import { useState } from 'react';
import { motion } from 'framer-motion';
import type { RoomConfig } from '@mus/engine';
import { CardFace } from '../components/CardFace.tsx';
import { ConfigForm, configSummary } from '../components/ConfigForm.tsx';
import { RulesSheet } from '../components/RulesSheet.tsx';
import { Button, Sheet } from '../components/ui.tsx';
import { useBackend } from '../lib/backendContext.tsx';
import { useInstall } from '../lib/install.ts';
import { CONFIG_KEY, NAME_KEY, loadConfig, saveConfig } from '../lib/prefs.ts';
import { navigate } from '../lib/router.ts';
import { store } from '../lib/storage.ts';
import { toast } from '../lib/toast.ts';

export function Logo({ size = 84 }: { size?: number }) {
  return (
    <motion.svg className="home__logo will-change-transform" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.65, ease: 'easeOut' }}>
      <path d="M27 13 73 19 63 88 17 82Z" fill="#16392f" stroke="#547b61" strokeWidth="2" />
      <path d="M33 10h42a8 8 0 0 1 8 8v62a8 8 0 0 1-8 8H25a8 8 0 0 1-8-8V18a8 8 0 0 1 8-8h8Z" fill="url(#logo-gold)" />
      <path d="M33 17h42a1 1 0 0 1 1 1v62a1 1 0 0 1-1 1H25a1 1 0 0 1-1-1V18a1 1 0 0 1 1-1h8Z" fill="none" stroke="#fff0bd" strokeWidth="1.5" />
      <path d="M32 68V34l18 22 18-22v34" fill="none" stroke="#12372e" strokeWidth="7" strokeLinecap="square" strokeLinejoin="round" />
      <path d="m31 25 3-5 3 5-3 5Z" fill="#a8493e" />
      <path d="m66 75 3-5 3 5-3 5Z" fill="#a8493e" />
      <defs><linearGradient id="logo-gold" x1="20" y1="12" x2="84" y2="88" gradientUnits="userSpaceOnUse"><stop stopColor="#f4d27c" /><stop offset="1" stopColor="#c48b2e" /></linearGradient></defs>
    </motion.svg>
  );
}

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
    <main className="home">
      <header className="home__hero">
        <div className="home__brand">
          <Logo size={60} />
          <span><b>MUS</b><small>ONLINE</small></span>
        </div>
        <span className="home__eyebrow">EL JUEGO DE SIEMPRE, EN TU MESA</span>
        <h1>La mesa<br /><em>está puesta.</em></h1>
        <p>Reúne a tu pareja, prepara los envites<br className="home__desktop-break" /> y que empiece la partida.</p>
        <div className="home__features" aria-label="Características">
          <span>2 contra 2</span>
          <span>En tiempo real</span>
          <span>Con amigos o bots</span>
        </div>
        <div className="home__art" aria-hidden="true">
          <div className="home__art-card home__art-card--back"><CardFace card={{ id: 'e7', rank: 7, suit: 'espadas' }} /></div>
          <div className="home__art-card home__art-card--left"><CardFace card={{ id: 'c12', rank: 12, suit: 'copas' }} /></div>
          <div className="home__art-card home__art-card--right"><CardFace card={{ id: 'o1', rank: 1, suit: 'oros' }} /></div>
          <span className="home__art-chip home__art-chip--one">5</span>
          <span className="home__art-chip home__art-chip--two">1</span>
          <span className="home__art-spark">✦</span>
        </div>
      </header>

      <motion.section className="panel motion-safe:transition-transform" initial={{ opacity: 0, y: 18 }}
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
        <Button variant="primary" block disabled={!online || !nameOk || busy !== null} onClick={() => void enter('create')}>
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
      <motion.button type="button" className="btn btn--secondary btn--block home__bots focus-visible:ring-2 focus-visible:ring-amber-300"
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
