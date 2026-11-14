import { AnimatePresence, motion } from 'framer-motion';
import type { Lance, PublicState, Seat } from '@mus/engine';
import { LANCE_LABEL, betSummary, turnHint } from '../game/describe.ts';

const ORDER: Lance[] = ['grande', 'chica', 'pares', 'juego'];

/** Migas de pan de la mano (Grande · Chica · Pares · Juego) y pista de a quién le toca. Ocupa una sola franja. */
export function LanceTrack({ view, mySeat, names }: { view: PublicState; mySeat: Seat; names: string[] }) {
  const current = view.lance
    ? ORDER.indexOf(view.lance.lance === 'punto' ? 'juego' : view.lance.lance)
    : view.phase === 'handEnd' || view.phase === 'matchEnd' ? 4 : -1;
  const hint = turnHint(view, mySeat, names);
  const isPunto = view.lance?.lance === 'punto' || view.settlements.some((s) => s.lance === 'punto');

  return (
    <div className="grid justify-items-center gap-[3px]">
      <ol className="flex flex-wrap justify-center gap-1" aria-label="Lances">
        {ORDER.map((l, i) => {
          const st = view.settlements.find((s) => s.lance === (l === 'juego' && isPunto ? 'punto' : l));
          const state = i < current ? 'done' : i === current ? 'now' : 'next';
          return (
            <motion.li
              key={l}
              layout
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-[3px] text-[9px] font-bold uppercase tracking-[.09em] ${
                state === 'now'
                  ? 'border-amber-200 bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-[0_3px_12px_rgba(0,0,0,.25)]'
                  : state === 'done'
                    ? 'border-white/10 bg-white/5 text-white/60'
                    : 'border-white/10 bg-white/[.025] text-white/35'
              }`}
            >
              {l === 'juego' && isPunto ? 'Punto' : LANCE_LABEL[l]}
              {st && <small className="text-[9px] font-extrabold">{st.outcome === 'seen' ? st.stake : st.outcome === 'folded' ? '✕' : '–'}</small>}
            </motion.li>
          );
        })}
      </ol>
      <p className={`min-h-[14px] text-center text-[11px] leading-tight ${hint.mine ? 'font-extrabold text-amber-300' : 'text-stone-400'}`}>{hint.text}</p>
    </div>
  );
}

/** Centro del tapete: título del lance, envite en curso y avisos (deje, juego, vaca…). */
export function TableCenter({ view, mySeat, names, banner }: { view: PublicState; mySeat: Seat; names: string[]; banner: string | null }) {
  const bet = betSummary(view, mySeat, names);
  const title = view.lance
    ? (view.lance.lance === 'punto' ? 'Punto' : LANCE_LABEL[view.lance.lance])
    : view.phase === 'discard' ? 'Descarte' : view.phase === 'mus' ? 'Mus' : '';
  const hot = Boolean(view.lance?.bet);
  const ordago = view.lance?.bet?.total === 'ordago';

  return (
    <div className="grid h-full min-h-0 place-items-center">
      <AnimatePresence mode="wait">
        {banner ? (
          <motion.div
            key={banner}
            className="px-2 text-center font-[var(--font-display)] text-[clamp(22px,7vw,34px)] font-bold leading-tight text-amber-300 [text-shadow:0_0_18px_rgba(240,195,95,.45)]"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.3 } }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          >
            {banner}
          </motion.div>
        ) : (
          <motion.div
            key="main"
            className="grid justify-items-center gap-[min(1.4dvh,10px)] text-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <span className="font-[var(--font-display)] text-[clamp(24px,8vw,40px)] font-bold leading-none text-amber-50/90">{title}</span>
            {bet && (
              <motion.div
                layout
                className={`grid gap-px rounded-2xl border px-4 py-1.5 backdrop-blur-sm ${
                  ordago
                    ? 'border-rose-500 bg-rose-950/70 shadow-[0_0_22px_rgba(255,77,94,.25)]'
                    : hot ? 'border-amber-300/60 bg-black/35' : 'border-white/10 bg-black/25'
                }`}
                animate={ordago ? { boxShadow: ['0 0 12px rgba(255,77,94,.15)', '0 0 28px rgba(255,77,94,.4)', '0 0 12px rgba(255,77,94,.15)'] } : undefined}
                transition={ordago ? { duration: 1.5, repeat: Infinity } : undefined}
              >
                <b className="text-[clamp(12px,3.6vw,16px)]">{bet.head}</b>
                <span className="text-[clamp(10px,2.9vw,12.5px)] text-emerald-100/60">{bet.sub}</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
