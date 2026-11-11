import { useState } from 'react';
import type { RoomConfig } from '@mus/engine';
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
    <svg width={size} height={size} viewBox="-60 -60 120 120" aria-hidden="true">
      <circle r="56" fill="#E2B455" />
      <circle r="43" fill="none" stroke="#0F2D26" strokeOpacity=".5" strokeWidth="3.4" />
      <path d="M-23 20 V-20 L0 9 L23 -20 V20" fill="none" stroke="#0F2D26" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
      </header>

      <section className="panel">
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
      </section>

      <div className="home__or"><span>O JUEGA POR TU CUENTA</span></div>
      <Button className="home__bots" block onClick={() => { remember(); navigate('/local'); }}>
        <span className="home__bot-mark" aria-hidden="true">♟</span>
        <span>Jugar contra bots<small>Sin conexión, cuando quieras</small></span>
        <span className="home__arrow" aria-hidden="true">→</span>
      </Button>

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
