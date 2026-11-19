/** Tamaños de marca: sm 32, md 56, lg 96 (o un número en px). */
export type LogoSize = 'sm' | 'md' | 'lg' | number;
const LOGO_PX = { sm: 32, md: 56, lg: 96 } as const;

/** Isotipo de STACKS: «S» monolítica de tres segmentos diagonales facetados en oro metálico, suelta (sin cuadrado ni borde). */
export function Logo({ size = 'md' }: { size?: LogoSize }) {
  const px = typeof size === 'number' ? size : LOGO_PX[size];
  return (
    <svg viewBox="96 96 320 320" width={px} height={px} role="img" aria-label="STACKS" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="lg-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FCE38A" /><stop offset="1" stopColor="#E3BD4A" /></linearGradient>
        <linearGradient id="lg-mid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E3BD4A" /><stop offset="1" stopColor="#D4AF37" /></linearGradient>
        <linearGradient id="lg-low" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D4AF37" /><stop offset="1" stopColor="#8C6314" /></linearGradient>
        <clipPath id="lg-c1"><polygon points="0,0 512,0 512,193 0,237" /></clipPath>
        <clipPath id="lg-c2"><polygon points="0,243 512,199 512,303 0,331" /></clipPath>
        <clipPath id="lg-c3"><polygon points="0,337 512,309 512,512 0,512" /></clipPath>
      </defs>
      {[['lg-c1', 'lg-top'], ['lg-c2', 'lg-mid'], ['lg-c3', 'lg-low']].map(([c, f]) => (
        <g key={c} clipPath={`url(#${c})`}>
          <g transform="translate(256 256) skewX(-10) translate(-256 -256)">
            <path d="M346 160H204V256H318V352H168" fill="none" stroke={`url(#${f})`} strokeWidth="64" strokeLinejoin="miter" strokeMiterlimit="10" />
          </g>
        </g>
      ))}
    </svg>
  );
}

/** Palabra STACKS: Unbounded Bold, tracking amplio y degradado oro metálico. */
export function Wordmark({ className = '', size = 22 }: { className?: string; size?: number }) {
  return (
    <span className={`inline-block select-none whitespace-nowrap font-bold uppercase leading-none tracking-[0.14em] ${className}`}
      style={{ fontFamily: "'Unbounded', 'Outfit', sans-serif", fontSize: size, background: 'linear-gradient(135deg,#F6D87A,#D4AF37)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
      STACKS
    </span>
  );
}
