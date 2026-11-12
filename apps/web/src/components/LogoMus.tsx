import { useId } from 'react';
import { motion } from 'framer-motion';

interface LogoMusProps {
  className?: string;
  iconClassName?: string;
}

export function LogoMus({
  className = '',
  iconClassName = 'w-[4.25rem] h-[4.25rem] sm:w-20 sm:h-20',
}: LogoMusProps) {
  const id = useId().replace(/:/g, '');
  const gold = `mus-gold-${id}`;
  const cardFace = `mus-card-${id}`;
  const coinFace = `mus-coin-face-${id}`;
  const shadow = `mus-shadow-${id}`;
  const shine = `mus-shine-${id}`;
  const coinClip = `mus-coin-clip-${id}`;

  return (
    <motion.div
      className={`home__brand ${className}`.trim()}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.045, filter: 'drop-shadow(0 0 14px rgba(234,179,8,.42))' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      role="img"
      aria-label="Mus Online"
    >
      <motion.svg
        className={`home__logo will-change-transform ${iconClassName}`}
        viewBox="0 0 110 100"
        aria-hidden="true"
        animate={{
          y: [0, -2, 0],
          rotate: [0, 0.8, 0],
          filter: [
            'drop-shadow(0 0 7px rgba(234,179,8,.2))',
            'drop-shadow(0 0 15px rgba(234,179,8,.48))',
            'drop-shadow(0 0 7px rgba(234,179,8,.2))',
          ],
        }}
        transition={{
          y: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
          rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
          filter: { duration: 4.2, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        <defs>
          <linearGradient id={gold} x1="20" y1="8" x2="95" y2="84" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff9d6" />
            <stop offset=".18" stopColor="#f4d57c" />
            <stop offset=".4" stopColor="#ae7022" />
            <stop offset=".58" stopColor="#fff0ad" />
            <stop offset=".8" stopColor="#d09232" />
            <stop offset="1" stopColor="#654019" />
          </linearGradient>
          <linearGradient id={cardFace} x1="14" y1="35" x2="69" y2="89" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fffdf3" />
            <stop offset=".72" stopColor="#e9dfc6" />
            <stop offset="1" stopColor="#b9a77f" />
          </linearGradient>
          <radialGradient id={coinFace} cx=".28" cy=".2" r=".9">
            <stop stopColor="#fff4c4" />
            <stop offset=".2" stopColor="#e8bd60" />
            <stop offset=".48" stopColor="#b97820" />
            <stop offset=".72" stopColor="#e2ad4b" />
            <stop offset="1" stopColor="#51351a" />
          </radialGradient>
          <linearGradient id={shine} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff8d8" stopOpacity=".9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id={shadow} x="-40%" y="-30%" width="180%" height="180%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity=".72" />
          </filter>
          <clipPath id={coinClip}>
            <circle cx="61" cy="43" r="27" />
          </clipPath>
        </defs>

        <g filter={`url(#${shadow})`}>
          <circle cx="61" cy="46" r="35" fill="#422b14" stroke="#e9bc57" strokeWidth="2" />
          <circle cx="61" cy="43" r="32" fill={`url(#${gold})`} stroke="#fff0b1" strokeWidth="1" />
          <circle cx="61" cy="43" r="28" fill={`url(#${coinFace})`} stroke="#84531f" strokeWidth="1" />
          <circle cx="61" cy="43" r="24" fill="none" stroke="#fff0b1" strokeOpacity=".92" strokeWidth="1.2" />
          <circle cx="61" cy="43" r="21" fill="none" stroke="#704719" strokeOpacity=".8" strokeWidth=".7" />
          <circle cx="61" cy="43" r="17.5" fill="none" stroke="#fff1ba" strokeOpacity=".7" strokeWidth=".65" />
          <path d="M37 39a25 25 0 0 1 17-20M70 18a26 26 0 0 1 15 11" fill="none" stroke="#fff6d2" strokeOpacity=".8" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M43 32h3M76 32h3M43 54h3M76 54h3" stroke="#fff1ba" strokeWidth="1.1" strokeLinecap="round" />
          <text x="61" y="52" textAnchor="middle" fill="#fff0bd" stroke="#78501e" strokeWidth=".5" fontFamily="Georgia,serif" fontSize="27" fontWeight="700">M</text>
          <path d="m61 14 1.3 2.8 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3-2.2-2.1 3-.4Z" fill="#fff7d0" />
        </g>

        <g filter={`url(#${shadow})`} stroke={`url(#${gold})`} strokeWidth="1.3">
          <g transform="rotate(-22 31 63)">
            <rect x="12" y="36" width="34" height="54" rx="4" fill={`url(#${cardFace})`} />
            <rect x="15" y="39" width="28" height="48" rx="2.5" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth=".8" />
            <text x="19" y="52" fill="#28543b" stroke="none" fontFamily="Georgia,serif" fontSize="11" fontWeight="700">A</text>
            <path d="m25 58 4 4-4 4-4-4Z" fill="#a33a32" stroke="none" />
            <path d="M36 80h4" stroke="#8c6430" strokeWidth=".7" />
          </g>
          <g transform="rotate(17 53 61)">
            <rect x="34" y="34" width="34" height="54" rx="4" fill={`url(#${cardFace})`} />
            <rect x="37" y="37" width="28" height="48" rx="2.5" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth=".8" />
            <text x="41" y="50" fill="#28543b" stroke="none" fontFamily="Georgia,serif" fontSize="11" fontWeight="700">K</text>
            <path d="M48 57c-2-3-6 0-4 3l4 4 4-4c2-3-2-6-4-3Z" fill="#a33a32" stroke="none" />
            <path d="M58 78h4" stroke="#8c6430" strokeWidth=".7" />
          </g>
        </g>

        <motion.rect
          x="-30"
          y="15"
          width="18"
          height="57"
          rx="9"
          fill={`url(#${shine})`}
          clipPath={`url(#${coinClip})`}
          transform="rotate(18 61 43)"
          animate={{ x: [-30, 140] }}
          transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 4.1, ease: 'easeInOut' }}
        />
      </motion.svg>
      <span className="home__wordmark">
        <b className="bg-gradient-to-b from-amber-100 via-yellow-400 to-amber-700 bg-clip-text font-serif text-transparent tracking-[0.16em]">MUS</b>
        <small className="font-sans text-white tracking-[0.28em]">ONLINE</small>
      </span>
    </motion.div>
  );
}
