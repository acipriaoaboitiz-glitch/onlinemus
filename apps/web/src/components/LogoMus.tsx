import { useId } from 'react';
import { motion } from 'framer-motion';

interface LogoMusProps {
  className?: string;
  iconClassName?: string;
}

export function LogoMus({
  className = '',
  iconClassName = 'w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem]',
}: LogoMusProps) {
  const id = useId().replace(/:/g, '');
  const gold = `mus-gold-${id}`;
  const cardFace = `mus-card-${id}`;
  const coinFace = `mus-coin-face-${id}`;
  const shadow = `mus-shadow-${id}`;
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
          rotate: [0, 0.8, 0],
          filter: [
            'drop-shadow(0 0 6px rgba(234,179,8,.18))',
            'drop-shadow(0 0 14px rgba(234,179,8,.42))',
            'drop-shadow(0 0 6px rgba(234,179,8,.18))',
          ],
        }}
        transition={{
          y: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
          filter: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <defs>
          <linearGradient id={gold} x1="13" y1="12" x2="85" y2="91" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff4c2" />
            <stop offset=".2" stopColor="#f4cb64" />
            <stop offset=".48" stopColor="#bd8125" />
            <stop offset=".72" stopColor="#f5d477" />
            <stop offset="1" stopColor="#805018" />
          </linearGradient>
          <linearGradient id={cardFace} x1="15" y1="18" x2="47" y2="82" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f8f2e4" />
            <stop offset="1" stopColor="#c9b991" />
          </linearGradient>
          <radialGradient id={coinFace} cx=".28" cy=".2" r=".9">
            <stop stopColor="#fff2b0" />
            <stop offset=".36" stopColor="#d8a43d" />
            <stop offset=".72" stopColor="#97611e" />
            <stop offset="1" stopColor="#4a3218" />
          </radialGradient>
          <linearGradient id={shine} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff8d8" stopOpacity=".9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id={shadow} x="-40%" y="-30%" width="180%" height="180%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity=".65" />
          </filter>
          <clipPath id={coin}>
            <circle cx="50" cy="50" r="26" />
          </clipPath>
        </defs>

        <g filter={`url(#${shadow})`}>
          <g fill={`url(#${cardFace})`} stroke={`url(#${gold})`} strokeWidth="1.5">
            <g transform="rotate(-24 34 50)">
              <rect x="15" y="17" width="34" height="66" rx="5" />
              <rect x="18" y="20" width="28" height="60" rx="3" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth=".7" />
              <text x="21" y="34" fill="#274435" stroke="none" fontFamily="Georgia,serif" fontSize="11" fontWeight="700">A</text>
              <path d="m27 39 4 4-4 4-4-4Z" fill="#a43d32" stroke="none" />
            </g>
            <g transform="rotate(24 66 50)">
              <rect x="51" y="17" width="34" height="66" rx="5" />
              <rect x="54" y="20" width="28" height="60" rx="3" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth=".7" />
              <text x="57" y="34" fill="#274435" stroke="none" fontFamily="Georgia,serif" fontSize="11" fontWeight="700">K</text>
              <path d="M65 39c-2-3-6 0-4 3l4 4 4-4c2-3-2-6-4-3Z" fill="#a43d32" stroke="none" />
            </g>
          </g>
        </g>
        <circle cx="50" cy="50" r="29" fill="#322315" stroke={`url(#${gold})`} strokeWidth="2.5" />
        <circle cx="50" cy="50" r="25.5" fill={`url(#${coinFace})`} stroke="#ffe8a0" strokeOpacity=".65" strokeWidth=".8" />
        <circle cx="50" cy="50" r="21.5" fill="none" stroke="#fff0b5" strokeOpacity=".78" strokeWidth=".8" />
        <circle cx="50" cy="50" r="18.5" fill="none" stroke="#6b451d" strokeOpacity=".72" strokeWidth="1" />
        <path d="M31 39a21 21 0 0 1 11-8" fill="none" stroke="#fff8d9" strokeOpacity=".72" strokeWidth="1.4" strokeLinecap="round" />
        <path
          d="M37 62V40l13 15 13-15v22"
          fill="none"
          stroke="#fff0bb"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <motion.rect
          x="-30"
          y="22"
          width="18"
          height="56"
          rx="9"
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
