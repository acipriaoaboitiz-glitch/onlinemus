import { useId } from 'react';
import { motion } from 'framer-motion';

interface LogoMusProps {
  className?: string;
  iconClassName?: string;
}

export function LogoMus({
  className = '',
  iconClassName = 'w-12 h-12 sm:w-14 sm:h-14',
}: LogoMusProps) {
  const id = useId().replace(/:/g, '');
  const gold = `mus-gold-${id}`;
  const shine = `mus-shine-${id}`;
  const coin = `mus-coin-${id}`;

  return (
    <motion.div
      className={`home__brand ${className}`.trim()}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.045, filter: 'drop-shadow(0 0 12px rgba(234,179,8,.35))' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      role="img"
      aria-label="Mus Online"
    >
      <motion.svg
        className={`home__logo will-change-transform ${iconClassName}`}
        viewBox="0 0 100 100"
        aria-hidden="true"
        animate={{
          y: [0, -2, 0],
          filter: [
            'drop-shadow(0 0 6px rgba(234,179,8,.18))',
            'drop-shadow(0 0 11px rgba(234,179,8,.36))',
            'drop-shadow(0 0 6px rgba(234,179,8,.18))',
          ],
        }}
        transition={{
          y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
          filter: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <defs>
          <linearGradient id={gold} x1="13" y1="12" x2="85" y2="91" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fef3c7" />
            <stop offset=".32" stopColor="#facc15" />
            <stop offset=".68" stopColor="#eab308" />
            <stop offset="1" stopColor="#a16207" />
          </linearGradient>
          <linearGradient id={shine} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".72" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={coin}>
            <circle cx="50" cy="50" r="32" />
          </clipPath>
        </defs>

        <g filter="drop-shadow(0 3px 4px rgba(0,0,0,.7))">
          <g fill="#111a14" stroke={`url(#${gold})`} strokeWidth="1.5">
            <g transform="rotate(-24 34 50)">
              <rect x="19" y="18" width="30" height="64" rx="4" />
              <path d="M26 27h16M26 72h16" stroke="#fff3c4" strokeOpacity=".55" />
            </g>
            <g transform="rotate(24 66 50)">
              <rect x="51" y="18" width="30" height="64" rx="4" />
              <path d="M58 27h16M58 72h16" stroke="#fff3c4" strokeOpacity=".55" />
            </g>
          </g>
        </g>
        <circle cx="50" cy="50" r="35" fill="#111713" stroke={`url(#${gold})`} strokeWidth="2" />
        <circle cx="50" cy="50" r="31" fill={`url(#${gold})`} />
        <circle cx="50" cy="50" r="26" fill="#172019" stroke="#fef3c7" strokeOpacity=".7" strokeWidth="1.2" />
        <circle cx="50" cy="50" r="22" fill="none" stroke="#eab308" strokeOpacity=".55" strokeWidth=".8" />
        <path
          d="M29 66V35l21 24 21-24v31"
          fill="none"
          stroke={`url(#${gold})`}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="m50 17 2.2 4.5 4.8.7-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8-3.5-3.4 4.8-.7Z" fill="#fff3c4" />
        <motion.rect
          x="-30"
          y="12"
          width="22"
          height="76"
          rx="11"
          fill={`url(#${shine})`}
          clipPath={`url(#${coin})`}
          transform="rotate(18 50 50)"
          animate={{ x: [-30, 130] }}
          transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 4.1, ease: 'easeInOut' }}
        />
      </motion.svg>
      <span className="home__wordmark">
        <b className="font-serif text-amber-300 tracking-[0.22em]">MUS</b>
        <small className="font-sans text-white/80 tracking-[0.28em]">ONLINE</small>
      </span>
    </motion.div>
  );
}
