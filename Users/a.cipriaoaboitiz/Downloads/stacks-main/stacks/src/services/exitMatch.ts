import type { NavigateFunction } from 'react-router-dom';
import { getActiveRoom, setActiveRoom } from './multiplayer.ts';
import { releaseBackTrap } from './backStack.ts';
import { cancelGameTimers } from './timers.ts';
import { social } from '../store/social.ts';
import { silence } from '../utils/sound.ts';

let leaving = false;

/**
 * Salida atómica de una partida, siempre en este orden:
 *  1. cancela todos los temporizadores de la mesa (bots, esperas, cinemáticas) y corta el sonido en curso;
 *  2. sale de la sala online (cierra canal/presencia de Supabase) y publica «En el lobby»;
 *  3. fundido rápido, retira la entrada trampa del historial (botón Atrás de Android) y navega a `/` con `replace`.
 * Es idempotente: un segundo toque mientras sale no hace nada.
 */
export async function exitMatch(nav: NavigateFunction): Promise<void> {
  if (leaving) return;
  leaving = true;
  try {
    cancelGameTimers();
    silence();
    const code = getActiveRoom()?.code;
    setActiveRoom(null);
    social.closeRoom(code);
    const root = document.getElementById('root');
    if (root) { root.style.transition = 'opacity 110ms ease-out'; root.style.opacity = '0'; }
    await releaseBackTrap();
    nav('/', { replace: true });
    window.setTimeout(() => { if (root) { root.style.transition = ''; root.style.opacity = ''; } }, 60);
  } finally {
    window.setTimeout(() => { leaving = false; }, 400);
  }
}
