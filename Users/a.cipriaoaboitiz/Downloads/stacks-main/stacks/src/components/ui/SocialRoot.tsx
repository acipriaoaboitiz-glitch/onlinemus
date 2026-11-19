import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GAMES } from '../../games/registry.ts';
import { getActiveRoom } from '../../services/multiplayer.ts';
import { useProfile } from '../../store/profile.ts';
import { social } from '../../store/social.ts';
import { startProfileSync } from '../../store/profileSync.ts';
import { watchAccount } from '../../store/account.ts';
import { LiveNotificationBanner } from './LiveNotificationBanner.tsx';

/** Arranca el club social, publica qué estás haciendo según la ruta y monta los avisos en vivo (visibles también dentro de las partidas). */
export function SocialRoot() {
  const { pathname } = useLocation();
  const profile = useProfile();
  useEffect(() => { watchAccount(); }, []);
  useEffect(() => {
    if (!profile) return;
    void social.start();
    return startProfileSync(); // fichas, victorias y cosméticos suben a stacks_profiles con debounce de 3 s
  }, [profile]);
  // Fundido de entrada de 160 ms al cambiar de pantalla (solo opacity: 60 FPS, sin backdrop-filter).
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    root.classList.remove('route-in');
    void root.offsetWidth;
    root.classList.add('route-in');
    const t = window.setTimeout(() => root.classList.remove('route-in'), 220);
    return () => window.clearTimeout(t);
  }, [pathname]);
  useEffect(() => {
    const game = GAMES.find((g) => g.route === pathname || `/play/${g.id}` === pathname);
    if (game) { social.setActivity('playing', game.id); return; }
    const room = getActiveRoom();
    if (room && pathname === '/') social.setActivity('room', room.gameId, room.code);
    else social.setActivity('lobby');
  }, [pathname]);
  return <LiveNotificationBanner />;
}
