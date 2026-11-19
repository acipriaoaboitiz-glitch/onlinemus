import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { botName, tr } from '../../i18n/index.ts';
import { useReplica, useSeating, type Seating } from '../../services/onlineGame.ts';

/** Jugador de un duelo 1 contra 1. `p0` siempre es quien abre la serie. */
export interface DuelPlayer { id: 'p0' | 'p1'; name: string; human: boolean; /** Jugador de la sala (partida online). */ peerId?: string }

/** Pareja del duelo: tú contra un bot local, o los jugadores de la sala (con un bot si falta uno). */
export function duelPlayers(seating: Seating): DuelPlayer[] {
  if (!seating.online) return [{ id: 'p0', name: tr('g.you'), human: true }, { id: 'p1', name: botName(1), human: false }];
  const h = seating.humans;
  const a = h[0]!;
  const b = h[1];
  return [
    { id: 'p0', name: a.name, human: true, peerId: a.peerId },
    b ? { id: 'p1', name: b.name, human: true, peerId: b.peerId } : { id: 'p1', name: botName(1), human: false },
  ];
}

export interface Duel<S, A> {
  seating: Seating;
  online: boolean;
  s: S | null;
  setS: Dispatch<SetStateAction<S | null>>;
  /** Tu id de jugador (`p0` o `p1`). */
  me: 'p0' | 'p1';
  myIdx: 0 | 1;
  /** Sin sala o anfitrión: quien hace avanzar la partida (IA, rondas nuevas). */
  hostLike: boolean;
  dispatch: (pid: string, a: A) => void;
  /** Empieza una serie nueva (solo anfitrión / local). */
  restart: () => void;
}

/**
 * Esqueleto común de los duelos (3 en Raya, 4 en Raya, Hundir la Flota): arranque local o de sala, réplica del estado con el
 * anfitrión como autoridad y quién eres tú. Los motores son puros: `apply(estado, pid, acción)` devuelve el estado nuevo o null.
 */
export function useDuel<S extends { players: DuelPlayer[] }, A>(gameId: string, create: (players: DuelPlayer[]) => S, apply: (s: S, pid: string, a: A) => S | null): Duel<S, A> {
  const seating = useSeating(gameId);
  const online = seating.online;
  const [s, setS] = useState<S | null>(() => (online ? null : create(duelPlayers(seating))));
  const hostLike = !online || seating.isHost;
  const noS = s === null;
  useEffect(() => { if (online && seating.isHost && noS) setS(create(duelPlayers(seating))); }, [online, seating.isHost, noS]); // eslint-disable-line react-hooks/exhaustive-deps
  const { dispatch } = useReplica<S, A>(seating, s, setS, apply, (st, peer) => st.players.find((q) => q.peerId === peer)?.id ?? null);
  const me = online ? s?.players.find((p) => p.peerId === seating.myPeerId)?.id ?? 'p0' : 'p0';
  return { seating, online, s, setS, me, myIdx: me === 'p0' ? 0 : 1, hostLike, dispatch, restart: () => setS(create(duelPlayers(seating))) };
}
