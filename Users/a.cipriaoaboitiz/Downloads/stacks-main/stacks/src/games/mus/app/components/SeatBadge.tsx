import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Bubble } from '../game/describe.ts';
import type { SeatInfo } from '../game/types.ts';
import { CardBack } from './CardFace.tsx';
import { TableAvatar } from './TableAvatar.tsx';

interface SeatBadgeProps {
  info: SeatInfo;
  tone: 'us' | 'them' | 'me';
  mano: boolean;
  turn: boolean;
  bubble?: Bubble;
  deadline: number | null;
  cards: number;
  signalPulseAt?: number | null;
  /** Aviso corto pegado al avatar (p. ej. «+2» o «Ø»). */
  badge?: string;
  /** Hace parpadear el aro del avatar en rojo/ámbar. */
  alert?: boolean;
  /** Aura de fuego dorado pulsante (p. ej. una sola carta en UNO). */
  aura?: boolean;
  /** Hacia dónde se abre el globo de diálogo, para que nunca se salga del tapete. */
  bubbleSide?: 'below' | 'left' | 'right' | 'above';
}

/** Jugador en la mesa: avatar con anillo de turno, mano, conexión, cartas boca abajo y su último «grito». */
function SeatBadgeView({ info, tone, mano, turn, deadline, cards, signalPulseAt, badge, alert, aura }: SeatBadgeProps) {
  const name = info.name ?? 'Libre';
  const remaining = deadline ? Math.max(0, deadline - Date.now()) : 0;
  return (
    <div className="relative grid min-w-0 justify-items-center gap-[2px] transition-opacity duration-200" style={{ opacity: turn ? 1 : 0.78 }} role="group" aria-label={`${name}${turn ? ', tiene el turno' : ''}${mano ? ', es mano' : ''}`}>
      <motion.div
        className="relative grid place-items-center rounded-full p-[3px]"
        key={signalPulseAt ?? 'idle'}
        animate={signalPulseAt ? { scale: [1, 1.1, 1] } : undefined}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {aura && (
          <>
            <span aria-hidden="true" className="aura-fire pointer-events-none absolute inset-[-9px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,214,90,0) 50%, rgba(255,196,60,.9) 63%, rgba(255,120,20,0) 76%)' }} />
            <span aria-hidden="true" className="aura-fire pointer-events-none absolute inset-[-14px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,160,40,0) 55%, rgba(255,140,30,.65) 66%, rgba(255,80,10,0) 78%)', animationDelay: '.45s' }} />
          </>
        )}
        {turn && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[-2px] rounded-full border-[1.5px] border-amber-200/80 shadow-[0_0_14px_rgba(242,202,112,.55)]"
            animate={{ opacity: [0.7, 1, 0.7], scale: [0.98, 1.04, 0.98] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {alert && (
          <motion.span aria-hidden="true" className="pointer-events-none absolute inset-[-3px] rounded-full border-[3px] border-red-500"
            animate={{ opacity: [0, 1, 0.2, 1, 0] }} transition={{ duration: 1.2, ease: 'easeInOut' }} />
        )}
        {badge && (
          <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.18 }}
            className="absolute -bottom-1 -right-2 z-10 rounded-full border border-white/70 bg-red-600 px-1.5 py-[1px] text-[10px] font-extrabold leading-none text-white shadow">{badge}</motion.span>
        )}
        {turn && deadline !== null && (
          <svg className="pointer-events-none absolute inset-[-2px] size-[calc(100%+4px)] -rotate-90" viewBox="0 0 56 56" key={deadline} aria-hidden="true">
            <motion.circle
              cx="28" cy="28" r="26" fill="none" stroke="#f0c35f" strokeWidth="3" strokeLinecap="round"
              initial={{ pathLength: 1 }} animate={{ pathLength: 0 }}
              transition={{ duration: remaining / 1000, ease: 'linear' }}
            />
          </svg>
        )}
        <TableAvatar name={name} tone={tone} className="size-[min(12.5vw,6.8dvh,66px)] text-[min(5vw,2.8dvh)]" />
        {mano && (
          <span title="Mano" className="absolute -right-0.5 -top-0.5 grid size-[17px] place-items-center rounded-full border-2 border-[#0b211a] bg-amber-300 text-[9px] font-extrabold text-amber-950">M</span>
        )}
        {!info.isBot && (
          <span title={info.online ? 'Conectado' : 'Desconectado'} className={`absolute bottom-0 right-0 size-[9px] rounded-full border-2 border-[#0b211a] ${info.online ? 'bg-emerald-400' : 'bg-red-500'}`} />
        )}
      </motion.div>
      <span className={`max-w-full truncate text-[min(3.1vw,1.6dvh,13px)] font-bold ${turn ? 'text-amber-200 [text-shadow:0_0_12px_rgba(226,180,85,.4)]' : 'text-stone-200'}`}>{name}</span>
      {turn && info.isBot && (
        <span className="flex items-center gap-[3px]" role="status" aria-label="Pensando">
          {[0, 1, 2].map((d) => (
            <motion.span key={d} className="block size-[4px] rounded-full bg-amber-200" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }} />
          ))}
        </span>
      )}
      {/* Hasta 4 dorsos; con más cartas, 2 dorsos y ×N, así nunca se sale del hueco de su asiento */}
      <span className="flex items-center gap-[2px]" aria-label={`${cards} cartas`}>
        {Array.from({ length: cards > 4 ? 2 : cards }, (_, i) => (
          <span key={i} className="relative block aspect-[12/19] h-[min(3.3dvh,22px)]"><CardBack /></span>
        ))}
        {cards > 4 && <b className="ml-0.5 text-[10px] tabular-nums text-amber-200/90">×{cards}</b>}
      </span>
      {/* Sin bocadillos sobre la mesa: el turno se ve solo en el anillo dorado del avatar */}
    </div>
  );
}

/** Se repinta solo si cambia algo visible (las props de objeto como `info` se recrean en cada render del padre). */
export const SeatBadge = memo(SeatBadgeView, (a, b) =>
  a.info.name === b.info.name && a.info.isBot === b.info.isBot && a.info.online === b.info.online && a.tone === b.tone && a.mano === b.mano && a.turn === b.turn
  && a.cards === b.cards && a.deadline === b.deadline && a.signalPulseAt === b.signalPulseAt && a.bubbleSide === b.bubbleSide && a.badge === b.badge && a.alert === b.alert && a.aura === b.aura
  && a.bubble?.at === b.bubble?.at && a.bubble?.text === b.bubble?.text);
