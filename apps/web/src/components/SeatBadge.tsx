import { AnimatePresence, motion } from 'framer-motion';
import type { Bubble, Tone } from '../game/describe.ts';
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
  /** Hacia dónde se abre el globo de diálogo, para que nunca se salga del tapete. */
  bubbleSide?: 'below' | 'left' | 'right' | 'above';
}

const BUBBLE_TONE: Record<Tone, string> = {
  neutral: 'bg-stone-100 text-zinc-900',
  bet: 'bg-amber-300 text-amber-950',
  good: 'bg-emerald-100 text-emerald-950',
  bad: 'bg-red-100 text-red-950',
  ordago: 'bg-rose-500 text-white',
};

const BUBBLE_POS: Record<NonNullable<SeatBadgeProps['bubbleSide']>, string> = {
  below: 'left-1/2 top-full mt-0.5 -translate-x-1/2',
  above: 'bottom-full left-1/2 mb-0.5 -translate-x-1/2',
  left: 'left-0 top-full mt-0.5',
  right: 'right-0 top-full mt-0.5',
};

/** Jugador en la mesa: avatar con anillo de turno, mano, conexión, cartas boca abajo y su último «grito». */
export function SeatBadge({ info, tone, mano, turn, bubble, deadline, cards, signalPulseAt, bubbleSide = 'below' }: SeatBadgeProps) {
  const name = info.name ?? 'Libre';
  const remaining = deadline ? Math.max(0, deadline - Date.now()) : 0;
  return (
    <div className="relative grid min-w-0 justify-items-center gap-[2px]" role="group" aria-label={`${name}${turn ? ', tiene el turno' : ''}${mano ? ', es mano' : ''}`}>
      <motion.div
        className="relative grid place-items-center rounded-full p-[3px]"
        key={signalPulseAt ?? 'idle'}
        animate={signalPulseAt ? { boxShadow: ['0 0 0 rgba(234,179,8,0)', '0 0 18px rgba(234,179,8,.8)', '0 0 0 rgba(234,179,8,0)'] } : undefined}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {turn && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[-2px] rounded-full border-[1.5px] border-amber-200/80 shadow-[0_0_14px_rgba(242,202,112,.55)]"
            animate={{ opacity: [0.7, 1, 0.7], scale: [0.98, 1.04, 0.98] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
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
      <span className="flex gap-[2px]" aria-label={`${cards} cartas`}>
        {Array.from({ length: cards }, (_, i) => (
          <span key={i} className="relative block aspect-[12/19] h-[min(3.3dvh,22px)]"><CardBack /></span>
        ))}
      </span>
      <AnimatePresence>
        {bubble && (
          <motion.span
            key={bubble.at}
            className={`absolute z-10 max-w-[34vw] whitespace-normal rounded-xl px-2.5 py-1 text-center text-[11px] font-extrabold leading-tight shadow-[0_4px_14px_rgba(0,0,0,.45)] ${BUBBLE_TONE[bubble.tone]} ${BUBBLE_POS[bubbleSide]}`}
            initial={{ opacity: 0, scale: 0.6, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          >
            {bubble.text}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
