import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';
import { getActiveRoom, type Room, type RoomSnapshot } from './multiplayer.ts';

/**
 * Sincronización de partidas en sala: el ANFITRIÓN es la autoridad.
 * - El anfitrión mantiene el estado, mueve a los bots y lo difunde tras cada cambio.
 * - Los demás aplican su jugada al instante (optimista) y la envían al anfitrión; si este la rechaza,
 *   su estado vuelve a pisar el local. Mensajes: `state` (anfitrión → todos), `act` y `hello` (cliente → anfitrión).
 * Fuera de una sala activa de este juego todo funciona en local, igual que antes.
 */
type Wire<S, A> = { t: 'state'; s: S } | { t: 'act'; pid: string; a: A } | { t: 'hello' };

export interface Seating {
  /** Hay una sala activa y empezada de este juego. */
  online: boolean;
  isHost: boolean;
  room: Room | null;
  myPeerId: string | null;
  /** Humanos de la sala por orden de asiento. */
  humans: { peerId: string; name: string; seat: number }[];
  fillBots: boolean;
}

const OFFLINE: Seating = { online: false, isHost: true, room: null, myPeerId: null, humans: [], fillBots: false };

/** Lee la sala activa (si es de este juego y ya empezó) y la mantiene al día. */
export function useSeating(gameId: string): Seating {
  const room = getActiveRoom();
  const mine = room && room.gameId === gameId ? room : null;
  const snap: RoomSnapshot | null = useSyncExternalStore(
    (l) => (mine ? mine.subscribe(l) : () => {}),
    () => (mine ? mine.getSnapshot() : null),
  );
  return useMemo(() => {
    if (!mine || !snap || !snap.started || !snap.me) return OFFLINE;
    return {
      online: true, isHost: snap.me.isHost, room: mine, myPeerId: snap.me.id, fillBots: snap.fillBots,
      humans: snap.players.map((p) => ({ peerId: p.id, name: p.name, seat: p.seat })),
    };
    // eslint-disable-next-line
  }, [mine, snap?.started, snap?.me?.id, snap?.me?.isHost, snap?.fillBots, snap?.players.map((p) => p.id).join()]);
}

/**
 * Réplica del estado de la partida. `apply` es el reductor del motor (devuelve null si la jugada no vale).
 * `dispatch(pid, acción)` sirve igual en local, como anfitrión o como cliente.
 */
export function useReplica<S, A>(
  seating: Seating,
  state: S | null,
  setState: Dispatch<SetStateAction<S | null>>,
  apply: (s: S, pid: string, a: A) => S | null,
  /** Qué jugador (id de la partida) es cada peer: el anfitrión lo usa para validar quién envía cada jugada. */
  pidOfPeer: (s: S, peerId: string) => string | null,
): { dispatch: (pid: string, a: A) => void } {
  const { online, isHost, room } = seating;
  const stateRef = useRef(state);
  stateRef.current = state;
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const pidRef = useRef(pidOfPeer);
  pidRef.current = pidOfPeer;

  const broadcast = useCallback(() => {
    if (room && stateRef.current) room.sendGame({ t: 'state', s: stateRef.current } satisfies Wire<S, A>);
  }, [room]);

  // Anfitrión: difunde cada cambio de estado.
  useEffect(() => { if (online && isHost && state) broadcast(); }, [online, isHost, state, broadcast]);

  // Mensajes entrantes.
  useEffect(() => {
    if (!online || !room) return;
    return room.onGame((from, data) => {
      const m = data as Wire<S, A>;
      if (isHost) {
        if (m.t === 'hello') { broadcast(); return; }
        if (m.t === 'act') {
          const cur = stateRef.current;
          if (!cur || pidRef.current(cur, from) !== m.pid) return; // solo puedes mover tu propio asiento
          const next = applyRef.current(cur, m.pid, m.a);
          if (next) setState(next); else broadcast(); // jugada rechazada: el cliente vuelve al estado real
        }
      } else if (m.t === 'state') {
        setState(m.s);
      }
    });
  }, [online, isHost, room, broadcast, setState]);

  // Cliente: pide el estado hasta recibir el primero (el anfitrión pudo difundirlo antes de que esta pantalla abriera).
  const got = state !== null;
  useEffect(() => {
    if (!online || isHost || !room || got) return;
    const send = () => room.sendGame({ t: 'hello' } satisfies Wire<S, A>);
    send();
    const i = window.setInterval(send, 700);
    return () => window.clearInterval(i);
  }, [online, isHost, room, got]);

  const dispatch = useCallback((pid: string, a: A) => {
    setState((cur) => (cur ? applyRef.current(cur, pid, a) ?? cur : cur));
    if (online && !isHost && room) room.sendGame({ t: 'act', pid, a } satisfies Wire<S, A>);
  }, [online, isHost, room, setState]);

  return { dispatch };
}

/** Mesas por parejas (asientos 0+2 contra 1+3): 4 jugadores si hay bots o alguien en los asientos 2–3; si no, 1 contra 1. */
export const teamTableSize = (seating: Seating): 2 | 4 => (seating.fillBots || seating.humans.some((h) => h.seat >= 2) ? 4 : 2);

/** Un jugador por asiento: el humano que lo ocupa o, si está libre, un bot. */
export function playersBySeat(seating: Seating, n: number, botName: (i: number) => string): { id: string; name: string; human: boolean; peerId?: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const h = seating.humans.find((x) => x.seat === i);
    return h ? { id: `p${i}`, name: h.name, human: true, peerId: h.peerId } : { id: `p${i}`, name: botName(i), human: false };
  });
}
