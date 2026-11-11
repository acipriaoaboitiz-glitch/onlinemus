import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { GameSource, Snapshot } from './types.ts';
import { bannerFor, bubbleFor, logLine } from './describe.ts';
import type { Bubble, LogLine } from './describe.ts';
import type { Seat } from '@mus/engine';

export function useSnapshot(source: GameSource): Snapshot {
  return useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
}

export interface Feed {
  bubbles: Record<number, Bubble>;
  banner: string | null;
  /** Últimas jugadas, de la más antigua a la más reciente. */
  log: (LogLine & { id: number })[];
}

/** Globos de cada jugador y mensajes destacados del centro, a partir de los eventos de la partida. */
export function useFeed(source: GameSource, mySeat: Seat, names: readonly string[]): Feed {
  const [bubbles, setBubbles] = useState<Record<number, Bubble>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [log, setLog] = useState<(LogLine & { id: number })[]>([]);
  const namesRef = useRef(names);
  namesRef.current = names;
  const nextId = useRef(0);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const queue: string[] = [];
    let showing = false;

    const pump = () => {
      if (showing) return;
      const next = queue.shift();
      if (next === undefined) return;
      showing = true;
      setBanner(next);
      timers.add(setTimeout(() => { showing = false; setBanner(null); pump(); }, 1150));
    };

    const off = source.onEvents((events) => {
      const fresh: Record<number, Bubble> = {};
      const lines: (LogLine & { id: number })[] = [];
      let n = 0;
      for (const e of events) {
        if (e.t === 'handStart') { queue.length = 0; showing = false; setBanner(null); }
        const line = logLine(e, namesRef.current, mySeat);
        if (line) lines.push({ ...line, id: nextId.current++ });
        const b = bubbleFor(e);
        if (b) fresh[b.seat] = { text: b.text, tone: b.tone, at: Date.now() + n++ };
        const text = bannerFor(e, mySeat);
        if (text) queue.push(text);
      }
      if (queue.length > 3) queue.splice(0, queue.length - 3); // si los bots van deprisa, no arrastrar avisos viejos
      if (lines.length > 0) setLog((prev) => [...prev, ...lines].slice(-60));
      if (Object.keys(fresh).length > 0) {
        setBubbles((prev) => ({ ...prev, ...fresh }));
        timers.add(setTimeout(() => {
          setBubbles((prev) => {
            const next = { ...prev };
            for (const k of Object.keys(fresh)) if (next[Number(k)]?.at === fresh[Number(k)].at) delete next[Number(k)];
            return next;
          });
        }, 2600));
      }
      pump();
    });
    return () => { off(); timers.forEach(clearTimeout); };
  }, [source, mySeat]);

  return { bubbles, banner, log };
}
